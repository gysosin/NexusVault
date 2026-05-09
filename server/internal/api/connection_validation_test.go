package api

import "testing"

func TestNormalizeConnectionFieldsDefaultsSSH(t *testing.T) {
	fields, err := normalizeConnectionFields(" Production ", " bastion.internal ", 0, " deploy ", "")
	if err != nil {
		t.Fatalf("normalizeConnectionFields() error = %v", err)
	}

	if fields.Name != "Production" {
		t.Fatalf("Name = %q, want %q", fields.Name, "Production")
	}
	if fields.Host != "bastion.internal" {
		t.Fatalf("Host = %q, want %q", fields.Host, "bastion.internal")
	}
	if fields.Username != "deploy" {
		t.Fatalf("Username = %q, want %q", fields.Username, "deploy")
	}
	if fields.Type != connectionTypeSSH {
		t.Fatalf("Type = %q, want %q", fields.Type, connectionTypeSSH)
	}
	if fields.Port != 22 {
		t.Fatalf("Port = %d, want %d", fields.Port, 22)
	}
}

func TestNormalizeConnectionFieldsDefaultsRDP(t *testing.T) {
	fields, err := normalizeConnectionFields("Windows", "desktop.internal", 0, "administrator", " RDP ")
	if err != nil {
		t.Fatalf("normalizeConnectionFields() error = %v", err)
	}

	if fields.Type != connectionTypeRDP {
		t.Fatalf("Type = %q, want %q", fields.Type, connectionTypeRDP)
	}
	if fields.Port != 3389 {
		t.Fatalf("Port = %d, want %d", fields.Port, 3389)
	}
}

func TestNormalizeConnectionFieldsRejectsBlankHost(t *testing.T) {
	if _, err := normalizeConnectionFields("Prod", "   ", 22, "deploy", "ssh"); err == nil {
		t.Fatal("normalizeConnectionFields() error = nil, want error")
	}
}

func TestNormalizeConnectionFieldsRejectsInvalidType(t *testing.T) {
	if _, err := normalizeConnectionFields("Prod", "host.internal", 22, "deploy", "telnet"); err == nil {
		t.Fatal("normalizeConnectionFields() error = nil, want error")
	}
}

func TestNormalizeConnectionFieldsRejectsInvalidPort(t *testing.T) {
	for _, port := range []int{-1, 65536} {
		if _, err := normalizeConnectionFields("Prod", "host.internal", port, "deploy", "ssh"); err == nil {
			t.Fatalf("normalizeConnectionFields(port=%d) error = nil, want error", port)
		}
	}
}
