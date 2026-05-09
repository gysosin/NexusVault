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
		NodeEnv:          "production",
		JWTSecret:        strings.Repeat("j", minProductionSecretLength),
		APISecret:        strings.Repeat("a", minProductionSecretLength),
		CredentialSecret: strings.Repeat("c", minProductionSecretLength),
	}

	err := cfg.Validate()
	if err == nil {
		t.Fatal("Validate() error = nil, want required service URL error")
	}
	if !strings.Contains(err.Error(), "DATABASE_URL") || !strings.Contains(err.Error(), "REDIS_URL") {
		t.Fatalf("Validate() error = %q, want DATABASE_URL and REDIS_URL", err)
	}
}

func TestValidateRequiresDistinctProductionCredentialSecret(t *testing.T) {
	sharedSecret := strings.Repeat("s", minProductionSecretLength)
	cfg := Config{
		NodeEnv:          "production",
		DatabaseURL:      "postgres://user:pass@localhost:5432/nexusvault?sslmode=disable",
		RedisURL:         "redis://localhost:6379",
		JWTSecret:        strings.Repeat("j", minProductionSecretLength),
		APISecret:        sharedSecret,
		CredentialSecret: sharedSecret,
	}

	err := cfg.Validate()
	if err == nil {
		t.Fatal("Validate() error = nil, want distinct credential secret error")
	}
	if !strings.Contains(err.Error(), "CREDENTIAL_SECRET must be distinct") {
		t.Fatalf("Validate() error = %q, want distinct credential secret error", err)
	}
}

func TestValidateRequiresProductionAuthRateLimit(t *testing.T) {
	cfg := Config{
		NodeEnv:          "production",
		DatabaseURL:      "postgres://user:pass@localhost:5432/nexusvault?sslmode=disable",
		RedisURL:         "redis://localhost:6379",
		JWTSecret:        strings.Repeat("j", minProductionSecretLength),
		APISecret:        strings.Repeat("a", minProductionSecretLength),
		CredentialSecret: strings.Repeat("c", minProductionSecretLength),
	}

	err := cfg.Validate()
	if err == nil {
		t.Fatal("Validate() error = nil, want auth rate limit error")
	}
	if !strings.Contains(err.Error(), "AUTH_RATE_LIMIT_REQUESTS") || !strings.Contains(err.Error(), "AUTH_RATE_LIMIT_WINDOW") {
		t.Fatalf("Validate() error = %q, want auth rate limit errors", err)
	}
}
