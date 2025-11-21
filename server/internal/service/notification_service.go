package service

import (
	"sync"

	"go-server/internal/utils"
)

type NotificationService struct {
	subscribers map[*SafeConn]bool
	mu          sync.RWMutex
}

var NotificationHub = &NotificationService{
	subscribers: make(map[*SafeConn]bool),
}

func (s *NotificationService) AddSubscriber(conn *SafeConn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.subscribers[conn] = true
	utils.Log("New notification subscriber added. Total:", len(s.subscribers))
}

func (s *NotificationService) RemoveSubscriber(conn *SafeConn) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.subscribers, conn)
	utils.Log("Notification subscriber removed. Total:", len(s.subscribers))
}

func (s *NotificationService) Broadcast(message interface{}) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for conn := range s.subscribers {
		go func(c *SafeConn) {
			if err := c.WriteJSON(message); err != nil {
				utils.Log("Failed to send notification:", err)
				s.RemoveSubscriber(c)
				c.Close()
			}
		}(conn)
	}
}
