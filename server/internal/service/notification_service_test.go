package service

import (
	"testing"

	"go-server/internal/db"
)

func TestNotificationBroadcastWithoutRedis(t *testing.T) {
	previousRedis := db.Redis
	t.Cleanup(func() {
		db.Redis = previousRedis
	})
	db.Redis = nil

	service := &NotificationService{subscribers: make(map[*SafeConn]bool)}
	service.Broadcast(map[string]string{"type": "session.started"})
}

func TestNotificationInitRedisSubWithoutRedis(t *testing.T) {
	previousRedis := db.Redis
	t.Cleanup(func() {
		db.Redis = previousRedis
	})
	db.Redis = nil

	service := &NotificationService{subscribers: make(map[*SafeConn]bool)}
	service.InitRedisSub()
}
