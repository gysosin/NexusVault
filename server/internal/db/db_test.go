package db

import (
	"testing"

	"github.com/jmoiron/sqlx"
)

func TestConfigureConnectionPoolLimitsOpenConnections(t *testing.T) {
	testDB, err := sqlx.Open("postgres", "postgres://example.invalid/nexusvault?sslmode=disable")
	if err != nil {
		t.Fatalf("sqlx.Open() error = %v", err)
	}
	t.Cleanup(func() {
		_ = testDB.Close()
	})

	configureConnectionPool(testDB)

	if got := testDB.Stats().MaxOpenConnections; got != databaseMaxOpenConnections {
		t.Fatalf("MaxOpenConnections = %d, want %d", got, databaseMaxOpenConnections)
	}
}
