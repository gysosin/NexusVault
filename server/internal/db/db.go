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

const (
	startupConnectionTimeout     = 5 * time.Second
	databaseMaxOpenConnections   = 25
	databaseMaxIdleConnections   = 10
	databaseConnectionMaxAge     = 30 * time.Minute
	databaseConnectionMaxIdleAge = 5 * time.Minute
)

func InitDb() {
	var err error
	ctx, cancel := context.WithTimeout(context.Background(), startupConnectionTimeout)
	defer cancel()

	DB, err = sqlx.ConnectContext(ctx, "postgres", config.Envs.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database within %s: %v", startupConnectionTimeout, err)
	}
	configureConnectionPool(DB)
	schemaCtx, schemaCancel := context.WithTimeout(context.Background(), startupConnectionTimeout)
	defer schemaCancel()
	ensureRuntimeSchema(schemaCtx, DB)

	log.Println("Connected to database")
}

func configureConnectionPool(database *sqlx.DB) {
	database.SetMaxOpenConns(databaseMaxOpenConnections)
	database.SetMaxIdleConns(databaseMaxIdleConnections)
	database.SetConnMaxLifetime(databaseConnectionMaxAge)
	database.SetConnMaxIdleTime(databaseConnectionMaxIdleAge)
}

func ensureRuntimeSchema(ctx context.Context, database *sqlx.DB) {
	statements := []string{
		`ALTER TABLE connections ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT FALSE`,
		`CREATE INDEX IF NOT EXISTS idx_connections_user_favorite_created_at ON connections (user_id, is_favorite, created_at DESC)`,
	}

	for _, statement := range statements {
		if _, err := database.ExecContext(ctx, statement); err != nil {
			log.Fatalf("Failed to apply runtime schema update: %v", err)
		}
	}
}
