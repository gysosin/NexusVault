package websocket

import (
	"encoding/json"
	"net/http"
	"time"

	"go-server/internal/db"
	"go-server/internal/models"
	"go-server/internal/service"
	"go-server/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WSMessage struct {
	Type    string          `json:"type"`
	Payload string          `json:"payload,omitempty"` // Encrypted payload for connect
	Data    json.RawMessage `json:"data,omitempty"`    // For other messages
	// Fields for direct binding if not encrypted/nested
	Token        string `json:"token,omitempty"`
	SessionID    string `json:"sessionId,omitempty"`
	ID           string `json:"id,omitempty"` // Alias for SessionID in resume
	ConnectionID int    `json:"connectionId,omitempty"`
	Host         string `json:"host,omitempty"`
	Username     string `json:"username,omitempty"`
	Password     string `json:"password,omitempty"`
	Port         int    `json:"port,omitempty"`
	Protocol     string `json:"protocol,omitempty"` // ssh | rdp
	Width        int    `json:"width,omitempty"`
	Height       int    `json:"height,omitempty"`
	Rows         int    `json:"rows,omitempty"`
	Cols         int    `json:"cols,omitempty"`
}

// HandleWebSocket manages the WebSocket connection
func HandleWebSocket(c *gin.Context) {
	ws, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		utils.Log("Failed to upgrade to WebSocket:", err)
		return
	}
	// Wrap ws in SafeConn
	safeWs := service.NewSafeConn(ws)
	defer safeWs.Close()

	var currentSessionID string

	// Helper to send JSON
	sendJSON := func(v interface{}) {
		safeWs.WriteJSON(v)
	}

	// Helper to send Error
	sendError := func(msg string) {
		sendJSON(gin.H{"type": "error", "message": msg})
	}

	defer func() {
		if currentSessionID != "" {
			session := service.GetSession(currentSessionID)
			if session != nil {
				session.RemoveSocket(safeWs)
			}
		}
	}()

	for {
		_, message, err := safeWs.ReadMessage()
		if err != nil {
			break
		}

		var msg WSMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		switch msg.Type {
		case "connect":
			// Handle connect
			// Decrypt payload if present
			if msg.Payload != "" {
				decrypted, err := utils.Decrypt(msg.Payload)
				if err != nil {
					sendError("Failed to decrypt connection payload.")
					continue
				}
				// Re-unmarshal decrypted payload into msg fields
				// Note: The decrypted payload is a JSON object with host, username, etc.
				// We need to parse it.
				var payloadData WSMessage
				if err := json.Unmarshal([]byte(decrypted), &payloadData); err != nil {
					sendError("Invalid encrypted payload.")
					continue
				}
				// Merge payloadData into msg
				msg.Host = payloadData.Host
				msg.Username = payloadData.Username
				msg.Password = payloadData.Password
				msg.Port = payloadData.Port
				msg.Token = payloadData.Token
				msg.ConnectionID = payloadData.ConnectionID
				msg.Width = payloadData.Width
				msg.Height = payloadData.Height
				// Decrypted payload uses "type" for protocol (ssh/rdp)
				if msg.Protocol == "" && payloadData.Type != "" {
					msg.Protocol = payloadData.Type
				}
			}

			// Verify Auth
			claims, err := utils.VerifyToken(msg.Token)
			if err != nil {
				sendError(err.Error())
				continue
			}

			// If connectionID provided, fetch details
			if msg.ConnectionID != 0 {
				var conn models.Connection
				err := db.DB.Get(&conn, "SELECT * FROM connections WHERE id = $1 AND user_id = $2", msg.ConnectionID, claims.UserID)
				if err != nil {
					sendError("Connection not found.")
					continue
				}
				msg.Host = conn.Host
				msg.Username = conn.Username
				msg.Port = conn.Port
				if conn.Password != "" {
					decryptedPass, err := utils.Decrypt(conn.Password)
					if err == nil {
						msg.Password = decryptedPass
					}
				}
				if msg.Protocol == "" && conn.Type != "" {
					msg.Protocol = conn.Type
				}
				// msg.Type (protocol) might need handling if passed in payload vs connection
			}

			if msg.Host == "" || msg.Username == "" || msg.Password == "" {
				sendError("Host, username, and password are required.")
				continue
			}

			// Resolve protocol
			protocol := msg.Protocol
			if protocol == "" {
				if msg.Port == 3389 {
					protocol = "rdp"
				} else {
					protocol = "ssh"
				}
			}

			if msg.Port == 0 {
				if protocol == "rdp" {
					msg.Port = 3389
				} else {
					msg.Port = 22
				}
			}

			// Create Session
			sessionID := uuid.New().String()
			session := &service.Session{
				ID:           sessionID,
				UserID:       claims.UserID,
				ConnectionID: &msg.ConnectionID,
				Host:         msg.Host,
				Port:         msg.Port,
				Username:     msg.Username,
				Password:     msg.Password,
				Type:         service.SessionTypeSSH, // default, override below
				CreatedAt:    time.Now(),
				LastActivity: time.Now(),
				Sockets:      make(map[*service.SafeConn]bool),
			}

			// Set type based on protocol hint
			if protocol == "rdp" {
				session.Type = service.SessionTypeRDP
				session.Width = msg.Width
				session.Height = msg.Height
			}

			session.AddSocket(safeWs)
			service.AddSession(session)
			currentSessionID = sessionID

			// Record history
			// ...

			// Send metadata
			sendJSON(gin.H{
				"type":         "session",
				"sessionId":    session.ID,
				"host":         session.Host,
				"username":     session.Username,
				"port":         session.Port,
				"connectionId": session.ConnectionID,
				"protocol":     string(session.Type),
			})

			// Start protocol-specific session
			if session.Type == service.SessionTypeRDP {
				go func() {
					if err := StartRDPSession(session); err != nil {
						utils.Log("RDP session failed to start:", err)
					}
				}()
			} else {
				go StartSSHSession(session)
			}

		case "resume":
			// Handle resume
			targetID := msg.SessionID
			if targetID == "" {
				targetID = msg.ID
			}

			claims, err := utils.VerifyToken(msg.Token)
			if err != nil {
				sendError(err.Error())
				continue
			}

			session := service.GetSession(targetID)
			if session == nil {
				sendError("Session is no longer active.")
				continue
			}

			if session.UserID != claims.UserID {
				sendError("Not authorized to resume this session.")
				continue
			}

			session.AddSocket(safeWs)
			currentSessionID = session.ID

			sendJSON(gin.H{
				"type":         "session",
				"sessionId":    session.ID,
				"host":         session.Host,
				"username":     session.Username,
				"port":         session.Port,
				"connectionId": session.ConnectionID,
				"protocol":     string(session.Type),
				"resumed":      true,
			})

			sendJSON(gin.H{"type": "status", "message": "Session resumed."})

			// Replay buffer
			session.BufferMutex.Lock()
			if session.Buffer != "" {
				sendJSON(gin.H{"type": "data", "data": session.Buffer})
			}
			session.BufferMutex.Unlock()

		case "input", "data":
			// Handle input
			session := service.GetSession(currentSessionID)
			if session != nil && session.Type == service.SessionTypeSSH {
				// msg.Data might be raw string or object?
				// Node.js: data.data
				// Here we need to extract string content
				// var inputData struct {
				// 	Data string `json:"data"`
				// }
				// Try to unmarshal from the raw message again or use a map
				// Simpler: assume msg.Data is the content if it's a string?
				// Actually msg is WSMessage struct.
				// Let's parse the raw message to get 'data' field content
				// Or define WSMessage better.

				// Let's use a map for flexible parsing
				var rawMap map[string]interface{}
				if err := json.Unmarshal(message, &rawMap); err == nil {
					if dataStr, ok := rawMap["data"].(string); ok {
						if session.Stdin != nil {
							session.Stdin(dataStr)
						}
					}
				}
			}

		case "resize":
			session := service.GetSession(currentSessionID)
			if session != nil && session.Type == service.SessionTypeSSH && session.ShellSession != nil {
				session.ShellSession.WindowChange(msg.Rows, msg.Cols)
			}
			if session != nil && session.Type == service.SessionTypeRDP {
				width := msg.Width
				height := msg.Height
				if width < 640 {
					width = 640
				}
				if height < 480 {
					height = 480
				}

				session.RDPConnMu.Lock()
				prevW := session.Width
				prevH := session.Height
				restarting := session.RDPReconnecting
				recent := time.Since(session.RDPLastResize) < 200*time.Millisecond
				session.Width = width
				session.Height = height
				session.RDPLastResize = time.Now()
				session.RDPConnMu.Unlock()

				if !restarting && !recent && (prevW != width || prevH != height) {
					go RestartRDPSession(session)
				}
			}

		case "rdp-input":
			session := service.GetSession(currentSessionID)
			if session != nil && session.Type == service.SessionTypeRDP {
				var rawMap map[string]interface{}
				if err := json.Unmarshal(message, &rawMap); err == nil {
					if ev, ok := rawMap["event"].(map[string]interface{}); ok {
						HandleRDPInput(session, ev)
					}
				}
			}

		case "disconnect":
			session := service.GetSession(currentSessionID)
			if session != nil {
				service.RemoveSession(session.ID)
				// Close SSH client?
				if session.SSHClient != nil {
					session.SSHClient.Close()
				}
				if session.RDPClient != nil {
					session.RDPClient.Close()
				}
				sendJSON(gin.H{"type": "status", "message": "Disconnecting session."})
				currentSessionID = ""
			}
		}
	}
}
