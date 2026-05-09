package security

import (
	"net/http"
	"testing"

	"go-server/internal/config"
)

func TestIsOriginAllowedRejectsCrossSiteOrigin(t *testing.T) {
	config.Envs = config.Config{
		NodeEnv:        "production",
		AllowedOrigins: "",
	}

	req, err := http.NewRequest(http.MethodGet, "https://vault.example/ws", nil)
	if err != nil {
		t.Fatalf("NewRequest() error = %v", err)
	}
	req.Host = "vault.example"
	req.Header.Set("Origin", "https://evil.example")

	if IsOriginAllowed(req) {
		t.Fatal("expected cross-site origin to be rejected")
	}
}

func TestIsOriginAllowedAllowsSameOrigin(t *testing.T) {
	config.Envs = config.Config{
		NodeEnv:        "production",
		AllowedOrigins: "",
	}

	req, err := http.NewRequest(http.MethodGet, "https://vault.example/ws", nil)
	if err != nil {
		t.Fatalf("NewRequest() error = %v", err)
	}
	req.Host = "vault.example"
	req.Header.Set("Origin", "https://vault.example")

	if !IsOriginAllowed(req) {
		t.Fatal("expected same-origin request to be allowed")
	}
}

func TestIsOriginAllowedAllowsConfiguredOrigin(t *testing.T) {
	config.Envs = config.Config{
		NodeEnv:        "production",
		AllowedOrigins: "https://admin.example, https://ops.example",
	}

	req, err := http.NewRequest(http.MethodGet, "https://vault.example/ws", nil)
	if err != nil {
		t.Fatalf("NewRequest() error = %v", err)
	}
	req.Host = "vault.example"
	req.Header.Set("Origin", "https://ops.example")

	if !IsOriginAllowed(req) {
		t.Fatal("expected configured origin to be allowed")
	}
}

func TestIsOriginAllowedRejectsWildcardInProduction(t *testing.T) {
	config.Envs = config.Config{
		NodeEnv:        "production",
		AllowedOrigins: "*",
	}

	req, err := http.NewRequest(http.MethodGet, "https://vault.example/ws", nil)
	if err != nil {
		t.Fatalf("NewRequest() error = %v", err)
	}
	req.Host = "vault.example"
	req.Header.Set("Origin", "https://evil.example")

	if IsOriginAllowed(req) {
		t.Fatal("expected wildcard origin to be rejected in production")
	}
}

func TestIsOriginAllowedAllowsWildcardInDevelopment(t *testing.T) {
	config.Envs = config.Config{
		NodeEnv:        "development",
		AllowedOrigins: "*",
	}

	req, err := http.NewRequest(http.MethodGet, "https://vault.example/ws", nil)
	if err != nil {
		t.Fatalf("NewRequest() error = %v", err)
	}
	req.Host = "vault.example"
	req.Header.Set("Origin", "https://preview.example")

	if !IsOriginAllowed(req) {
		t.Fatal("expected wildcard origin to be allowed in development")
	}
}
