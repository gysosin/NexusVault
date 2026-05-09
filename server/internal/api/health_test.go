package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"go-server/internal/db"

	"github.com/gin-gonic/gin"
)

func TestGetHealthStatusReportsMissingDependenciesDown(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalDB := db.DB
	originalRedis := db.Redis
	t.Cleanup(func() {
		db.DB = originalDB
		db.Redis = originalRedis
	})
	db.DB = nil
	db.Redis = nil

	router := gin.New()
	router.GET("/api/health", GetHealthStatus)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if response.Body.String() != `{"status":"down","database":"down","redis":"down"}` {
		t.Fatalf("body = %s, want all dependencies down", response.Body.String())
	}
}

func TestGetReadinessStatusFailsWhenDependenciesAreDown(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalDB := db.DB
	originalRedis := db.Redis
	t.Cleanup(func() {
		db.DB = originalDB
		db.Redis = originalRedis
	})
	db.DB = nil
	db.Redis = nil

	router := gin.New()
	router.GET("/api/ready", GetReadinessStatus)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/ready", nil)
	router.ServeHTTP(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusServiceUnavailable)
	}
}
