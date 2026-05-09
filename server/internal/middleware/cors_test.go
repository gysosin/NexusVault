package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"go-server/internal/config"

	"github.com/gin-gonic/gin"
)

func TestCORSMiddlewareCachesAllowedPreflightResponses(t *testing.T) {
	gin.SetMode(gin.TestMode)
	originalConfig := config.Envs
	t.Cleanup(func() {
		config.Envs = originalConfig
	})
	config.Envs = config.Config{
		NodeEnv:        "production",
		AllowedOrigins: "https://console.example",
	}

	router := gin.New()
	router.Use(CORSMiddleware())
	router.POST("/api/connections", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodOptions, "/api/connections", nil)
	request.Host = "vault.example"
	request.Header.Set("Origin", "https://console.example")
	request.Header.Set("Access-Control-Request-Method", http.MethodPost)
	router.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
	}
	if got := response.Header().Get("Access-Control-Max-Age"); got != "600" {
		t.Fatalf("Access-Control-Max-Age = %q, want %q", got, "600")
	}
}
