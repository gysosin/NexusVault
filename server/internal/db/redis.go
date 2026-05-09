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

	ctx, cancel := context.WithTimeout(context.Background(), startupConnectionTimeout)
	defer cancel()

	if err := Redis.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis within %s: %v", startupConnectionTimeout, err)
	}

	log.Println("Connected to Redis")
}
