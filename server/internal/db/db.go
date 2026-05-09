package db

import (
	"context"
	"log"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"go-server/internal/config"
)

var DB *sqlx.DB

const startupConnectionTimeout = 5 * time.Second

func InitDb() {
	var err error
	ctx, cancel := context.WithTimeout(context.Background(), startupConnectionTimeout)
	defer cancel()

	DB, err = sqlx.ConnectContext(ctx, "postgres", config.Envs.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database within %s: %v", startupConnectionTimeout, err)
	}

	log.Println("Connected to database")
}
