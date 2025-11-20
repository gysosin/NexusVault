package db

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"
	"go-server/internal/config"
)

var Redis *redis.Client

func InitRedis() {
	opts, err := redis.ParseURL(config.Envs.RedisURL)
	if err != nil {
		log.Fatalf("Invalid Redis URL: %v", err)
	}

	Redis = redis.NewClient(opts)

	if err := Redis.Ping(context.Background()).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	log.Println("Connected to Redis")
}
