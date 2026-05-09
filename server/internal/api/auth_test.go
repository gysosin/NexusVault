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

func TestNormalizeRegisterRequestTrimsIdentityFields(t *testing.T) {
	req := RegisterRequest{
		Username: "  alice  ",
		Email:    "  ALICE@Example.COM  ",
		Password: " passphrase ",
	}

	if err := normalizeRegisterRequest(&req); err != nil {
		t.Fatalf("normalizeRegisterRequest() error = %v, want nil", err)
	}
	if req.Username != "alice" {
		t.Fatalf("Username = %q, want alice", req.Username)
	}
	if req.Email != "alice@example.com" {
		t.Fatalf("Email = %q, want alice@example.com", req.Email)
	}
	if req.Password != " passphrase " {
		t.Fatalf("Password = %q, want original password preserved", req.Password)
	}
}

func TestNormalizeRegisterRequestRejectsBlankUsername(t *testing.T) {
	req := RegisterRequest{
		Username: "   ",
		Email:    "alice@example.com",
		Password: "passphrase",
	}

	if err := normalizeRegisterRequest(&req); err == nil {
		t.Fatal("normalizeRegisterRequest() error = nil, want blank username error")
	}
}

func TestValidateAccountPasswordRejectsShortPassword(t *testing.T) {
	if err := validateAccountPassword("short"); err == nil {
		t.Fatal("validateAccountPassword() error = nil, want short password error")
	}
}

func TestValidateAccountPasswordAcceptsEightCharacters(t *testing.T) {
	if err := validateAccountPassword("12345678"); err != nil {
		t.Fatalf("validateAccountPassword() error = %v, want nil", err)
	}
}
