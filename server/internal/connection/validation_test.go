package connection

import "testing"

func TestNormalizeSavedDefaultsSSH(t *testing.T) {
	fields, err := NormalizeSaved(" Production ", " bastion.internal ", 0, " deploy ", "")
	if err != nil {
		t.Fatalf("NormalizeSaved() error = %v", err)
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
	if fields.Type != TypeSSH {
		t.Fatalf("Type = %q, want %q", fields.Type, TypeSSH)
	}
	if fields.Port != 22 {
		t.Fatalf("Port = %d, want %d", fields.Port, 22)
	}
}

func TestNormalizeSavedDefaultsRDP(t *testing.T) {
	fields, err := NormalizeSaved("Windows", "desktop.internal", 0, "administrator", " RDP ")
	if err != nil {
		t.Fatalf("NormalizeSaved() error = %v", err)
	}

	if fields.Type != TypeRDP {
		t.Fatalf("Type = %q, want %q", fields.Type, TypeRDP)
	}
	if fields.Port != 3389 {
		t.Fatalf("Port = %d, want %d", fields.Port, 3389)
	}
}

func TestNormalizeSessionInfersRDPPort(t *testing.T) {
	fields, err := NormalizeSession("desktop.internal", 3389, "administrator", "")
	if err != nil {
		t.Fatalf("NormalizeSession() error = %v", err)
	}

	if fields.Type != TypeRDP {
		t.Fatalf("Type = %q, want %q", fields.Type, TypeRDP)
	}
	if fields.Port != 3389 {
		t.Fatalf("Port = %d, want %d", fields.Port, 3389)
	}
}

func TestNormalizeSavedRejectsBlankHost(t *testing.T) {
	if _, err := NormalizeSaved("Prod", "   ", 22, "deploy", TypeSSH); err == nil {
		t.Fatal("NormalizeSaved() error = nil, want error")
	}
}

func TestNormalizeSavedRejectsMalformedHosts(t *testing.T) {
	tests := []string{
		"https://host.internal",
		"host.internal/path",
		"user@host.internal",
		"host internal",
		"host\ninternal",
	}

	for _, host := range tests {
		if _, err := NormalizeSaved("Prod", host, 22, "deploy", TypeSSH); err == nil {
			t.Fatalf("NormalizeSaved(host=%q) error = nil, want error", host)
		}
	}
}

func TestNormalizeSavedRejectsInvalidType(t *testing.T) {
	if _, err := NormalizeSaved("Prod", "host.internal", 22, "deploy", "telnet"); err == nil {
		t.Fatal("NormalizeSaved() error = nil, want error")
	}
}

func TestNormalizeSavedRejectsInvalidPort(t *testing.T) {
	for _, port := range []int{-1, 65536} {
		if _, err := NormalizeSaved("Prod", "host.internal", port, "deploy", TypeSSH); err == nil {
			t.Fatalf("NormalizeSaved(port=%d) error = nil, want error", port)
		}
	}
}
