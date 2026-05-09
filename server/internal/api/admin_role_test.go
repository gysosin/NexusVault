package api

import (
	"context"
	"testing"

	"go-server/internal/db"
)

func TestNormalizeCreateRoleRequestNormalizesIdentity(t *testing.T) {
	req := createRoleRequest{
		ID:          "  Ops_Team  ",
		Name:        "  Operators  ",
		Description: "  Can manage sessions  ",
		Permissions: []string{"manage_users", "view_audit"},
	}

	if err := normalizeCreateRoleRequest(&req); err != nil {
		t.Fatalf("normalizeCreateRoleRequest() error = %v, want nil", err)
	}
	if req.ID != "ops_team" {
		t.Fatalf("ID = %q, want ops_team", req.ID)
	}
	if req.Name != "Operators" {
		t.Fatalf("Name = %q, want Operators", req.Name)
	}
	if req.Description != "Can manage sessions" {
		t.Fatalf("Description = %q, want trimmed description", req.Description)
	}
}

func TestNormalizeCreateRoleRequestRejectsInvalidID(t *testing.T) {
	req := createRoleRequest{
		ID:   "../admin",
		Name: "Operators",
	}

	if err := normalizeCreateRoleRequest(&req); err == nil {
		t.Fatal("normalizeCreateRoleRequest() error = nil, want invalid role id error")
	}
}

func TestNormalizeCreateRoleRequestRejectsUnknownPermission(t *testing.T) {
	req := createRoleRequest{
		ID:          "operators",
		Name:        "Operators",
		Permissions: []string{"root"},
	}

	if err := normalizeCreateRoleRequest(&req); err == nil {
		t.Fatal("normalizeCreateRoleRequest() error = nil, want unsupported permission error")
	}
}

func TestIsSystemRole(t *testing.T) {
	if !isSystemRole("admin") {
		t.Fatal("isSystemRole(admin) = false, want true")
	}
	if isSystemRole("operators") {
		t.Fatal("isSystemRole(operators) = true, want false")
	}
}

func TestIsAssignableUserRole(t *testing.T) {
	if !isAssignableUserRole("viewer") {
		t.Fatal("isAssignableUserRole(viewer) = false, want true")
	}
	if isAssignableUserRole("operators") {
		t.Fatal("isAssignableUserRole(operators) = true, want false")
	}
}

func TestCountRedisSessionKeysWithoutRedis(t *testing.T) {
	previousRedis := db.Redis
	t.Cleanup(func() {
		db.Redis = previousRedis
	})
	db.Redis = nil

	count, err := countRedisSessionKeys(context.Background())
	if err != nil {
		t.Fatalf("countRedisSessionKeys() error = %v, want nil", err)
	}
	if count != 0 {
		t.Fatalf("countRedisSessionKeys() = %d, want 0", count)
	}
}

func TestRevokeRedisSessionsForUserRequiresRedis(t *testing.T) {
	previousRedis := db.Redis
	t.Cleanup(func() {
		db.Redis = previousRedis
	})
	db.Redis = nil

	revoked, err := revokeRedisSessionsForUser(context.Background(), 42)
	if err == nil {
		t.Fatal("revokeRedisSessionsForUser() error = nil, want session store error")
	}
	if revoked != 0 {
		t.Fatalf("revokeRedisSessionsForUser() revoked = %d, want 0", revoked)
	}
}
