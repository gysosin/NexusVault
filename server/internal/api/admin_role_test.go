package api

import "testing"

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
