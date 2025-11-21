package service

import (
	"go-server/internal/utils"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	client "github.com/tomatome/grdp/client"
	"golang.org/x/crypto/ssh"
)

type SessionType string

const (
	SessionTypeSSH SessionType = "ssh"
	SessionTypeRDP SessionType = "rdp"
)

type Session struct {
	ID             string      `json:"id"`
	UserID         int         `json:"userId"`
	ConnectionID   *int        `json:"connectionId"`
	Host           string      `json:"host"`
	Port           int         `json:"port"`
	Username       string      `json:"username"`
	Password       string      `json:"-"`
	Type           SessionType `json:"type"`
	CreatedAt      time.Time   `json:"createdAt"`
	LastActivity   time.Time   `json:"lastActivity"`
	RestoreHistory bool        `json:"restoreHistory"`

	// RDP lifecycle coordination
	RDPConnMu       sync.Mutex `json:"-"`
	RDPReconnecting bool       `json:"rdpReconnecting"`
	RDPLastResize   time.Time  `json:"rdpLastResize"`

	// WebSocket connections (can be multiple for same session?)
	// Node.js implementation supports multiple sockets per session (Set<WebSocket>)
	Sockets      map[*SafeConn]bool `json:"-"`
	SocketsMutex sync.Mutex         `json:"-"`

	// Buffer for replay
	Buffer      string     `json:"buffer"`
	BufferMutex sync.Mutex `json:"-"`

	// SSH specific
	SSHClient    *ssh.Client        `json:"-"`
	ShellSession *ssh.Session       `json:"-"`
	Stdin        func(string) error `json:"-"`

	// RDP specific
	RDPClient *client.Client `json:"-"`
	Width     int            `json:"width"`
	Height    int            `json:"height"`
}

// SafeConn wraps websocket.Conn to ensure thread-safe writes
type SafeConn struct {
	Conn *websocket.Conn
	Mu   sync.Mutex
}

func NewSafeConn(conn *websocket.Conn) *SafeConn {
	return &SafeConn{Conn: conn}
}

func (sc *SafeConn) WriteJSON(v interface{}) error {
	sc.Mu.Lock()
	defer sc.Mu.Unlock()
	return sc.Conn.WriteJSON(v)
}

func (sc *SafeConn) WriteMessage(messageType int, data []byte) error {
	sc.Mu.Lock()
	defer sc.Mu.Unlock()
	return sc.Conn.WriteMessage(messageType, data)
}

func (sc *SafeConn) Close() error {
	sc.Mu.Lock()
	defer sc.Mu.Unlock()
	return sc.Conn.Close()
}

func (sc *SafeConn) ReadMessage() (int, []byte, error) {
	return sc.Conn.ReadMessage()
}

var (
	sessions = make(map[string]*Session)
	mu       sync.RWMutex
)

func AddSession(s *Session) {
	mu.Lock()
	defer mu.Unlock()
	sessions[s.ID] = s

	// Broadcast session started event
	NotificationHub.Broadcast(map[string]interface{}{
		"type":    "session_started",
		"session": s,
	})
}

func GetSession(id string) *Session {
	mu.RLock()
	defer mu.RUnlock()
	return sessions[id]
}

func RemoveSession(id string) {
	mu.Lock()
	defer mu.Unlock()
	delete(sessions, id)

	// Broadcast session terminated event
	NotificationHub.Broadcast(map[string]interface{}{
		"type":      "session_terminated",
		"sessionId": id,
	})
}

func GetAllSessions() []*Session {
	mu.RLock()
	defer mu.RUnlock()
	var allSessions []*Session
	for _, s := range sessions {
		allSessions = append(allSessions, s)
	}
	return allSessions
}

func CloseSession(id string) {
	utils.Log("CloseSession called for ID:", id)
	s := GetSession(id)
	if s == nil {
		utils.Log("CloseSession: Session not found for ID:", id)
		return
	}
	utils.Log("CloseSession: Closing session:", id)

	// Close WebSockets
	s.SocketsMutex.Lock()
	for ws := range s.Sockets {
		ws.Close()
	}
	s.Sockets = nil
	s.SocketsMutex.Unlock()

	// Close SSH/RDP clients
	if s.SSHClient != nil {
		s.SSHClient.Close()
	}
	if s.RDPClient != nil {
		s.RDPClient.Close()
	}

	RemoveSession(id)
}

func GetSessionsForUser(userID int) []*Session {
	mu.RLock()
	defer mu.RUnlock()
	var userSessions []*Session
	for _, s := range sessions {
		if s.UserID == userID {
			userSessions = append(userSessions, s)
		}
	}
	return userSessions
}

func (s *Session) AddSocket(ws *SafeConn) {
	s.SocketsMutex.Lock()
	defer s.SocketsMutex.Unlock()
	if s.Sockets == nil {
		s.Sockets = make(map[*SafeConn]bool)
	}
	s.Sockets[ws] = true
}

func (s *Session) RemoveSocket(ws *SafeConn) {
	s.SocketsMutex.Lock()
	defer s.SocketsMutex.Unlock()
	delete(s.Sockets, ws)
}

func (s *Session) Broadcast(msg interface{}) {
	s.SocketsMutex.Lock()
	defer s.SocketsMutex.Unlock()
	for ws := range s.Sockets {
		ws.WriteJSON(msg)
	}
}

func (s *Session) BroadcastBinary(data []byte) {
	s.SocketsMutex.Lock()
	defer s.SocketsMutex.Unlock()
	for ws := range s.Sockets {
		ws.WriteMessage(websocket.BinaryMessage, data)
	}
}

func (s *Session) AppendBuffer(data string) {
	s.BufferMutex.Lock()
	defer s.BufferMutex.Unlock()
	// Limit buffer size?
	if len(s.Buffer) > 100000 {
		s.Buffer = s.Buffer[len(s.Buffer)-100000:]
	}
	s.Buffer += data
}
