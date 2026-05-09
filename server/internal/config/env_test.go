package config

import (
	"strings"
	"testing"
)

func TestValidateRejectsDefaultProductionSecrets(t *testing.T) {
	cfg := Config{
		NodeEnv:     "production",
		JWTSecret:   "default_secret",
		APISecret:   "default_api_secret",
		DatabaseURL: "postgres://user:pass@localhost:5432/nexusvault?sslmode=disable",
		RedisURL:    "redis://localhost:6379",
	}

	err := cfg.Validate()
	if err == nil {
		t.Fatal("Validate() error = nil, want production secret error")
	}
	if !strings.Contains(err.Error(), "JWT_SECRET") || !strings.Contains(err.Error(), "API_SECRET") {
		t.Fatalf("Validate() error = %q, want JWT_SECRET and API_SECRET", err)
	}
}

func TestValidateAllowsDevelopmentDefaults(t *testing.T) {
	cfg := Config{
		NodeEnv:   "development",
		JWTSecret: "default_secret",
		APISecret: "default_api_secret",
	}

	if err := cfg.Validate(); err != nil {
		t.Fatalf("Validate() error = %v, want nil", err)
	}
}

func TestValidateRequiresProductionDatabaseAndRedis(t *testing.T) {
	cfg := Config{
		NodeEnv:   "production",
		JWTSecret: strings.Repeat("j", minProductionSecretLength),
		APISecret: strings.Repeat("a", minProductionSecretLength),
	}

	err := cfg.Validate()
	if err == nil {
		t.Fatal("Validate() error = nil, want required service URL error")
	}
	if !strings.Contains(err.Error(), "DATABASE_URL") || !strings.Contains(err.Error(), "REDIS_URL") {
		t.Fatalf("Validate() error = %q, want DATABASE_URL and REDIS_URL", err)
	}
}
