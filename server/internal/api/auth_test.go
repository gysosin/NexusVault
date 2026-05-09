package api

import (
	"context"
	"testing"
	"time"

	"go-server/internal/db"
)

func TestPersistLoginSessionRequiresRedis(t *testing.T) {
	originalRedis := db.Redis
	t.Cleanup(func() {
		db.Redis = originalRedis
	})
	db.Redis = nil

	err := persistLoginSession(context.Background(), "token", 42, time.Hour)
	if err == nil {
		t.Fatal("persistLoginSession() error = nil, want session store error")
	}
}
