package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	APISecret   string
	NodeEnv     string
	RedisURL    string
}

var Envs Config

func InitConfig() {
	// Load .env from the root directory (parent of go-server)
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found or error loading it, relying on system env vars")
	}

	Envs = Config{
		Port:        getEnv("PORT", "3000"),
		DatabaseURL: getEnv("DATABASE_URL", ""),
		JWTSecret:   getEnv("JWT_SECRET", "default_secret"),
		APISecret:   getEnv("API_SECRET", "default_api_secret"),
		NodeEnv:     getEnv("NODE_ENV", "development"),
		RedisURL:    getEnv("REDIS_URL", "redis://localhost:6379"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
