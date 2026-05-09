package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestDecryptPayloadMiddlewareRejectsOversizedBodies(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(DecryptPayloadMiddleware())
	router.POST("/api/auth/login", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/auth/login", strings.NewReader(strings.Repeat("a", 1024*1024+1)))
	router.ServeHTTP(response, request)

	if response.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusRequestEntityTooLarge)
	}
}
