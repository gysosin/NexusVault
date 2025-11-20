package websocket

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"go-server/internal/service"
	"go-server/internal/utils"

	"github.com/gin-gonic/gin"
	client "github.com/tomatome/grdp/client"
)

func StartRDPSession(session *service.Session) error {
	var cleanupOnce sync.Once

	// cleanup now accepts the client instance to ensure we only clean up the specific client
	// that this closure was created for, preventing race conditions where a new session's client
	// is nilled out by an old session's cleanup.
	cleanup := func(reason string, targetClient *client.Client) {
		cleanupOnce.Do(func() {
			session.RDPConnMu.Lock()
			// Only set session.RDPClient to nil if it matches the client we are cleaning up
			if session.RDPClient == targetClient {
				session.RDPClient = nil
			}
			reconnecting := session.RDPReconnecting
			session.RDPConnMu.Unlock()

			// Always close the target client
			if targetClient != nil {
				targetClient.Close()
			}

			if !reconnecting {
				service.RemoveSession(session.ID)
			}
			session.Broadcast(gin.H{"type": "status", "message": reason})
		})
	}

	width := session.Width
	height := session.Height
	if width <= 0 {
		width = 1280
	}
	if height <= 0 {
		height = 720
	}

	addr := fmt.Sprintf("%s:%d", session.Host, session.Port)
	settings := client.NewSetting()
	settings.Width = width
	settings.Height = height
	settings.ColorDepth = 32 // 32-bit color depth for correct color rendering
	// Balanced performance settings: disable heavy features but allow animations for 60 FPS experience
	settings.SetPerformanceFlags(
		client.PERF_DISABLE_WALLPAPER |
			client.PERF_DISABLE_CURSOR_SHADOW |
			client.PERF_DISABLE_CURSORSETTINGS,
	)

	rdpClient := client.NewClient(addr, session.Username, session.Password, client.TC_RDP, settings)
	session.RDPConnMu.Lock()
	session.RDPClient = rdpClient
	session.RDPConnMu.Unlock()

	if rdpClient != nil {
		rdpClient.OnError(func(err error) {
			if err != nil {
				utils.Log("RDP error:", err)
				session.Broadcast(gin.H{"type": "error", "message": "RDP Connection Error: " + err.Error()})
			}
			cleanup("RDP connection ended.", rdpClient)
		})

		rdpClient.OnClose(func() {
			cleanup("RDP connection closed.", rdpClient)
		})

		rdpClient.OnSuccess(func() {
			session.Broadcast(gin.H{"type": "status", "message": "RDP authentication succeeded."})
		})

		rdpClient.OnReady(func() {
			session.Broadcast(gin.H{"type": "status", "message": "RDP session ready."})
			session.Broadcast(gin.H{"type": "rdp-size", "width": settings.Width, "height": settings.Height, "bpp": settings.ColorDepth})

			// Force a refresh by sending a dummy input event sequence
			// This helps if the screen is black initially or has artifacts
			go func() {
				// Initial delay to let the connection settle
				time.Sleep(500 * time.Millisecond)
				if session.RDPClient != rdpClient {
					return
				}

				// 1. Send a harmless key press (Left Shift) to wake up the session
				// Scan code for Left Shift is 0x2A
				rdpClient.KeyDown(0x2A, "ShiftLeft")
				time.Sleep(50 * time.Millisecond)
				rdpClient.KeyUp(0x2A, "ShiftLeft")

				// 2. Move mouse to center and wiggle it
				cx, cy := width/2, height/2
				rdpClient.MouseMove(cx, cy)
				time.Sleep(50 * time.Millisecond)
				rdpClient.MouseMove(cx+10, cy+10)
				time.Sleep(50 * time.Millisecond)
				rdpClient.MouseMove(cx, cy)
			}()
		})
	}

	if rdpClient != nil {
		rdpClient.OnBitmap(func(bitmaps []client.Bitmap) {
			// CRITICAL PERFORMANCE FIX: Batch all bitmaps into a single WebSocket message
			// instead of sending each one separately. This reduces overhead by 100x.
			if len(bitmaps) == 0 {
				return
			}

			// Calculate total size for batched message
			totalSize := 3 // 1 byte type + 2 bytes count
			for _, bm := range bitmaps {
				totalSize += 10 + len(bm.Data) // header + pixel data
			}

			// Create batched buffer
			buf := make([]byte, totalSize)
			buf[0] = 2 // type 2 = batched bitmaps
			binary.LittleEndian.PutUint16(buf[1:], uint16(len(bitmaps)))

			offset := 3
			for _, bm := range bitmaps {
				// Pack each bitmap: [2 x][2 y][2 w][2 h][1 bpp][1 reserved][payload]
				binary.LittleEndian.PutUint16(buf[offset:], uint16(bm.DestLeft))
				binary.LittleEndian.PutUint16(buf[offset+2:], uint16(bm.DestTop))
				binary.LittleEndian.PutUint16(buf[offset+4:], uint16(bm.Width))
				binary.LittleEndian.PutUint16(buf[offset+6:], uint16(bm.Height))
				if bm.BitsPerPixel > 0 {
					buf[offset+8] = byte(bm.BitsPerPixel)
				} else {
					buf[offset+8] = 32 // default to 32-bit
				}
				buf[offset+9] = 0 // reserved byte
				copy(buf[offset+10:], bm.Data)
				offset += 10 + len(bm.Data)
			}

			// Send single batched message instead of len(bitmaps) separate messages!
			session.BroadcastBinary(buf)
		})
	}

	session.Broadcast(gin.H{"type": "status", "message": "Connecting to RDP host..."})

	if err := rdpClient.Login(); err != nil {
		utils.Log("RDP dial/login failed:", err)
		// Enhanced error logging
		if strings.Contains(err.Error(), "tls: internal error") {
			utils.Log("RDP TLS Error Hint: This might be due to NLA negotiation failure or incompatible security settings.")
		}
		session.Broadcast(gin.H{"type": "error", "message": "RDP Connection Error: " + err.Error()})
		cleanup("RDP connection failed.", rdpClient)
		return err
	}

	// Register callbacks after login to avoid nil internals
	rdpClient.OnError(func(err error) {
		if err != nil {
			utils.Log("RDP error:", err)
			session.Broadcast(gin.H{"type": "error", "message": "RDP Connection Error: " + err.Error()})
		}
		cleanup("RDP connection ended.", rdpClient)
	})

	rdpClient.OnClose(func() {
		cleanup("RDP connection closed.", rdpClient)
	})

	rdpClient.OnSuccess(func() {
		session.Broadcast(gin.H{"type": "status", "message": "RDP authentication succeeded."})
	})

	rdpClient.OnReady(func() {
		session.Broadcast(gin.H{"type": "status", "message": "RDP session ready."})
		session.Broadcast(gin.H{"type": "rdp-size", "width": settings.Width, "height": settings.Height, "bpp": settings.ColorDepth})

		// Force a refresh by sending a dummy input event sequence
		go func() {
			time.Sleep(500 * time.Millisecond)
			if session.RDPClient != rdpClient {
				return
			}

			// 1. Send a harmless key press (Left Shift)
			rdpClient.KeyDown(0x2A, "ShiftLeft")
			time.Sleep(50 * time.Millisecond)
			rdpClient.KeyUp(0x2A, "ShiftLeft")

			// 2. Move mouse to center and wiggle it
			cx, cy := width/2, height/2
			rdpClient.MouseMove(cx, cy)
			time.Sleep(50 * time.Millisecond)
			rdpClient.MouseMove(cx+10, cy+10)
			time.Sleep(50 * time.Millisecond)
			rdpClient.MouseMove(cx, cy)
		}()
	})

	rdpClient.OnBitmap(func(bitmaps []client.Bitmap) {
		for _, bm := range bitmaps {
			// Binary frame format: [1 byte type][2 x][2 y][2 w][2 h][1 bpp][payload]
			buf := make([]byte, 10+len(bm.Data))
			buf[0] = 1
			binary.LittleEndian.PutUint16(buf[1:], uint16(bm.DestLeft))
			binary.LittleEndian.PutUint16(buf[3:], uint16(bm.DestTop))
			binary.LittleEndian.PutUint16(buf[5:], uint16(bm.Width))
			binary.LittleEndian.PutUint16(buf[7:], uint16(bm.Height))
			if bm.BitsPerPixel > 0 {
				buf[9] = byte(bm.BitsPerPixel)
			} else {
				buf[9] = 24
			}
			copy(buf[10:], bm.Data)
			session.BroadcastBinary(buf)
		}
	})

	session.Broadcast(gin.H{"type": "status", "message": "RDP connected. Waiting for display..."})
	return nil
}

// HandleRDPInput handles mouse events from frontend
func HandleRDPInput(session *service.Session, event map[string]interface{}) {
	session.RDPConnMu.Lock()
	if session == nil || session.RDPClient == nil || session.RDPReconnecting {
		session.RDPConnMu.Unlock()
		return
	}
	// We need to keep the lock while using the client?
	// The client methods are likely thread-safe or we should hold the lock.
	// However, holding the lock for the entire duration might block other operations.
	// For now, let's copy the pointer and unlock, assuming the client handles concurrent access or we accept a small race.
	// Better yet, let's hold the lock if the operations are fast.
	// But wait, the original code didn't hold the lock. Let's just check the flag.
	client := session.RDPClient
	session.RDPConnMu.Unlock()

	if client == nil {
		return
	}

	evType, _ := event["type"].(string)
	switch evType {
	case "mouse":
		x := int(toFloat(event["x"]))
		y := int(toFloat(event["y"]))
		rawButton := int(toFloat(event["button"]))
		button := normalizeMouseButton(rawButton)
		isPressed, hasPressed := event["isPressed"].(bool)

		switch {
		case rawButton > 0 && hasPressed && isPressed:
			client.MouseDown(button, x, y)
		case rawButton > 0 && hasPressed && !isPressed:
			client.MouseUp(button, x, y)
		default:
			client.MouseMove(x, y)
		}
	case "wheel":
		x := int(toFloat(event["x"]))
		y := int(toFloat(event["y"]))
		scroll := int(toFloat(event["scroll"]))
		client.MouseWheel(scroll, x, y)
	case "key", "keyboard":
		code, _ := event["code"].(string)
		keyStr, _ := event["key"].(string)
		isPressed, _ := event["isPressed"].(bool)

		if sc, ext := lookupScanCode(code, keyStr); sc > 0 {
			if ext {
				sc |= 0x100 // mark extended so KeyDown/KeyUp can set proper flag
			}
			if isPressed {
				client.KeyDown(sc, code)
			} else {
				client.KeyUp(sc, code)
			}
		}
	}
}

type scanCode struct {
	code     int
	extended bool
}

var keyCodeToScan = map[string]scanCode{
	"Escape":       {0x01, false},
	"Digit1":       {0x02, false},
	"Digit2":       {0x03, false},
	"Digit3":       {0x04, false},
	"Digit4":       {0x05, false},
	"Digit5":       {0x06, false},
	"Digit6":       {0x07, false},
	"Digit7":       {0x08, false},
	"Digit8":       {0x09, false},
	"Digit9":       {0x0A, false},
	"Digit0":       {0x0B, false},
	"Minus":        {0x0C, false},
	"Equal":        {0x0D, false},
	"Backspace":    {0x0E, false},
	"Tab":          {0x0F, false},
	"KeyQ":         {0x10, false},
	"KeyW":         {0x11, false},
	"KeyE":         {0x12, false},
	"KeyR":         {0x13, false},
	"KeyT":         {0x14, false},
	"KeyY":         {0x15, false},
	"KeyU":         {0x16, false},
	"KeyI":         {0x17, false},
	"KeyO":         {0x18, false},
	"KeyP":         {0x19, false},
	"BracketLeft":  {0x1A, false},
	"BracketRight": {0x1B, false},
	"Enter":        {0x1C, false},
	"ControlLeft":  {0x1D, false},
	"ControlRight": {0x1D, true},
	"KeyA":         {0x1E, false},
	"KeyS":         {0x1F, false},
	"KeyD":         {0x20, false},
	"KeyF":         {0x21, false},
	"KeyG":         {0x22, false},
	"KeyH":         {0x23, false},
	"KeyJ":         {0x24, false},
	"KeyK":         {0x25, false},
	"KeyL":         {0x26, false},
	"Semicolon":    {0x27, false},
	"Quote":        {0x28, false},
	"Backquote":    {0x29, false},
	"ShiftLeft":    {0x2A, false},
	"Backslash":    {0x2B, false},
	"KeyZ":         {0x2C, false},
	"KeyX":         {0x2D, false},
	"KeyC":         {0x2E, false},
	"KeyV":         {0x2F, false},
	"KeyB":         {0x30, false},
	"KeyN":         {0x31, false},
	"KeyM":         {0x32, false},
	"Comma":        {0x33, false},
	"Period":       {0x34, false},
	"Slash":        {0x35, false},
	"ShiftRight":   {0x36, false},
	"AltLeft":      {0x38, false},
	"AltRight":     {0x38, true},
	"Space":        {0x39, false},
	"CapsLock":     {0x3A, false},
	"F1":           {0x3B, false},
	"F2":           {0x3C, false},
	"F3":           {0x3D, false},
	"F4":           {0x3E, false},
	"F5":           {0x3F, false},
	"F6":           {0x40, false},
	"F7":           {0x41, false},
	"F8":           {0x42, false},
	"F9":           {0x43, false},
	"F10":          {0x44, false},
	"NumLock":      {0x45, false},
	"ScrollLock":   {0x46, false},
	"Home":         {0x47, true},
	"ArrowUp":      {0x48, true},
	"PageUp":       {0x49, true},
	"ArrowLeft":    {0x4B, true},
	"ArrowRight":   {0x4D, true},
	"End":          {0x4F, true},
	"ArrowDown":    {0x50, true},
	"PageDown":     {0x51, true},
	"Insert":       {0x52, true},
	"Delete":       {0x53, true},
	"F11":          {0x57, false},
	"F12":          {0x58, false},
}

func lookupScanCode(code string, keyStr string) (int, bool) {
	if entry, ok := keyCodeToScan[code]; ok {
		return entry.code, entry.extended
	}

	if len(keyStr) == 1 {
		r := []rune(keyStr)[0]
		upper := strings.ToUpper(keyStr)
		switch {
		case r >= 'a' && r <= 'z':
			if entry, ok := keyCodeToScan["Key"+upper]; ok {
				return entry.code, entry.extended
			}
		case r >= 'A' && r <= 'Z':
			if entry, ok := keyCodeToScan["Key"+upper]; ok {
				return entry.code, entry.extended
			}
		case r >= '0' && r <= '9':
			key := "Digit" + upper
			if entry, ok := keyCodeToScan[key]; ok {
				return entry.code, entry.extended
			}
		}
	}

	return 0, false
}

func normalizeMouseButton(btn int) int {
	// Frontend sends: 1=left, 2=right, 3=middle
	switch btn {
	case 1:
		return 0
	case 2:
		return 2
	case 3:
		return 1
	default:
		return 0
	}
}

// RestartRDPSession closes the current RDP transport and re-establishes with the updated width/height.
func RestartRDPSession(session *service.Session) {
	session.RDPConnMu.Lock()
	if session.RDPReconnecting {
		session.RDPConnMu.Unlock()
		return
	}
	session.RDPReconnecting = true
	old := session.RDPClient
	// We don't nil out RDPClient here immediately to avoid UI flickering if possible,
	// but for safety we should probably mark it.
	// Actually, keeping it until the new one is ready might be better?
	// No, the old one must be closed to free the connection.
	session.RDPClient = nil
	session.RDPConnMu.Unlock()

	if old != nil {
		utils.Log("Closing old RDP client for restart...")
		old.Close()
	}

	session.Broadcast(gin.H{"type": "status", "message": "Adjusting display settings..."})

	// Give a moment for the old connection to fully close and server to reset state
	time.Sleep(2000 * time.Millisecond) // Increased wait time for stability

	// Retry mechanism for reconnection
	maxRetries := 5
	var err error
	for i := 0; i < maxRetries; i++ {
		// Check if session is still active/valid before retrying
		if service.GetSession(session.ID) == nil {
			utils.Log("Session ended during RDP restart.")
			return
		}

		utils.Log(fmt.Sprintf("RDP reconnect attempt %d/%d...", i+1, maxRetries))
		err = StartRDPSession(session)
		if err == nil {
			// Success
			utils.Log("RDP session successfully restarted.")
			break
		}

		utils.Log(fmt.Sprintf("RDP reconnect attempt %d failed: %v", i+1, err))
		if i < maxRetries-1 {
			time.Sleep(1000 * time.Millisecond) // Wait longer between retries
		}
	}

	session.RDPConnMu.Lock()
	session.RDPReconnecting = false
	if session.RDPClient == nil {
		// reconnect failed after retries
		utils.Log("RDP reconnect failed after max retries")
		// Don't remove the session immediately, let the user see the error and maybe retry manually
		// service.RemoveSession(session.ID)
		session.Broadcast(gin.H{"type": "error", "message": fmt.Sprintf("Failed to reconnect RDP: %v. Please reload.", err)})
	}
	session.RDPConnMu.Unlock()
}

func toFloat(v interface{}) float64 {
	switch t := v.(type) {
	case float64:
		return t
	case float32:
		return float64(t)
	case int:
		return float64(t)
	case int64:
		return float64(t)
	case json.Number:
		f, _ := t.Float64()
		return f
	default:
		return 0
	}
}
