package config

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

const minProductionSecretLength = 32

type Config struct {
	Port                    string
	DatabaseURL             string
	JWTSecret               string
	APISecret               string
	CredentialSecret        string
	NodeEnv                 string
	RedisURL                string
	AllowedOrigins          string
	AllowPublicRegistration bool
	AuthRateLimitRequests   int
	AuthRateLimitWindow     time.Duration
	SSHKnownHostsPath       string
	AllowInsecureSSHHostKey bool
}

var Envs Config

func InitConfig() {
	// Load .env from the root directory (parent of go-server)
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found or error loading it, relying on system env vars")
	}

	nodeEnv := getEnv("NODE_ENV", "development")
	isProduction := strings.EqualFold(strings.TrimSpace(nodeEnv), "production")
	allowPublicRegistrationDefault := !isProduction
	allowInsecureSSHHostKeyDefault := !isProduction

	apiSecret := getEnv("API_SECRET", "default_api_secret")

	Envs = Config{
		Port:                    getEnv("PORT", "3000"),
		DatabaseURL:             getEnv("DATABASE_URL", ""),
		JWTSecret:               getEnv("JWT_SECRET", "default_secret"),
		APISecret:               apiSecret,
		CredentialSecret:        getEnv("CREDENTIAL_SECRET", apiSecret),
		NodeEnv:                 nodeEnv,
		RedisURL:                getEnv("REDIS_URL", "redis://localhost:6379"),
		AllowedOrigins:          getEnv("ALLOWED_ORIGINS", ""),
		AllowPublicRegistration: getBoolEnv("ALLOW_PUBLIC_REGISTRATION", allowPublicRegistrationDefault),
		AuthRateLimitRequests:   getIntEnv("AUTH_RATE_LIMIT_REQUESTS", 10),
		AuthRateLimitWindow:     getDurationEnv("AUTH_RATE_LIMIT_WINDOW", time.Minute),
		SSHKnownHostsPath:       strings.TrimSpace(getEnv("SSH_KNOWN_HOSTS_PATH", "")),
		AllowInsecureSSHHostKey: getBoolEnv("ALLOW_INSECURE_SSH_HOST_KEYS", allowInsecureSSHHostKeyDefault),
	}

	if err := Envs.Validate(); err != nil {
		log.Fatalf("Invalid configuration: %v", err)
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getBoolEnv(key string, fallback bool) bool {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	switch strings.ToLower(strings.TrimSpace(value)) {
	case "1", "true", "yes", "y", "on":
		return true
	case "0", "false", "no", "n", "off":
		return false
	default:
		return fallback
	}
}

func getIntEnv(key string, fallback int) int {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed < 0 {
		return fallback
	}
	return parsed
}

func getDurationEnv(key string, fallback time.Duration) time.Duration {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}

	parsed, err := time.ParseDuration(strings.TrimSpace(value))
	if err != nil || parsed < 0 {
		return fallback
	}
	return parsed
}

func (c Config) Validate() error {
	if !strings.EqualFold(strings.TrimSpace(c.NodeEnv), "production") {
		return nil
	}

	var errs []error
	if strings.TrimSpace(c.DatabaseURL) == "" {
		errs = append(errs, errors.New("DATABASE_URL is required in production"))
	}
	if strings.TrimSpace(c.RedisURL) == "" {
		errs = append(errs, errors.New("REDIS_URL is required in production"))
	}
	if isWeakProductionSecret(c.JWTSecret, "default_secret") {
		errs = append(errs, fmt.Errorf("JWT_SECRET must be set to at least %d non-default characters in production", minProductionSecretLength))
	}
	if isWeakProductionSecret(c.APISecret, "default_api_secret") {
		errs = append(errs, fmt.Errorf("API_SECRET must be set to at least %d non-default characters in production", minProductionSecretLength))
	}
	if isWeakProductionSecret(c.CredentialSecret, "default_api_secret") {
		errs = append(errs, fmt.Errorf("CREDENTIAL_SECRET must be set to at least %d non-default characters in production", minProductionSecretLength))
	}
	if strings.TrimSpace(c.CredentialSecret) == strings.TrimSpace(c.APISecret) {
		errs = append(errs, errors.New("CREDENTIAL_SECRET must be distinct from API_SECRET in production"))
	}

	return errors.Join(errs...)
}

func isWeakProductionSecret(value string, defaultValue string) bool {
	value = strings.TrimSpace(value)
	return value == "" || value == defaultValue || len(value) < minProductionSecretLength
}
