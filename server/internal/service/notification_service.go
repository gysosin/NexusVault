package service

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"go-server/internal/db"
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
	// Publish to Redis instead of direct iteration
	ctx := context.Background()
	jsonMsg, err := json.Marshal(message)
	if err != nil {
		utils.Log("Failed to marshal notification message:", err)
		return
	}

	err = db.Redis.Publish(ctx, "system:notifications", jsonMsg).Err()
	if err != nil {
		utils.Log("Failed to publish notification to Redis:", err)
	}
}

func (s *NotificationService) InitRedisSub() {
	go func() {
		ctx := context.Background()
		pubsub := db.Redis.Subscribe(ctx, "system:notifications")
		defer pubsub.Close()

		ch := pubsub.Channel()

		for msg := range ch {
			s.broadcastToLocalSubscribers(msg.Payload)
		}
	}()
	log.Println("NotificationService subscribed to Redis channel: system:notifications")
}

func (s *NotificationService) broadcastToLocalSubscribers(payload string) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// We need to unmarshal to ensure it's valid JSON or just send raw string?
	// The original Broadcast took an interface{}, and WriteJSON handles marshaling.
	// Since we marshaled it before sending to Redis, the payload is a JSON string.
	// We can send it as a raw message or unmarshal/marshal.
	// To keep it simple and compatible with WriteJSON which expects an object,
	// let's unmarshal it back to an interface{} or send it as a pre-encoded message if SafeConn supports it.
	// Looking at SafeConn (implied), it likely has WriteJSON.
	// Let's unmarshal to a generic map to pass to WriteJSON.

	var message interface{}
	if err := json.Unmarshal([]byte(payload), &message); err != nil {
		utils.Log("Failed to unmarshal Redis message:", err)
		return
	}

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
