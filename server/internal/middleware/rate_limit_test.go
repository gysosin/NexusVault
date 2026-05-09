package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

func TestIPRateLimitBlocksRequestsOverLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(IPRateLimit(2, time.Minute))
	router.POST("/login", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	for i := 0; i < 2; i++ {
		response := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodPost, "/login", nil)
		request.RemoteAddr = "192.0.2.10:12345"

		router.ServeHTTP(response, request)

		if response.Code != http.StatusNoContent {
			t.Fatalf("request %d status = %d, want %d", i+1, response.Code, http.StatusNoContent)
		}
	}

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/login", nil)
	request.RemoteAddr = "192.0.2.10:12345"

	router.ServeHTTP(response, request)

	if response.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusTooManyRequests)
	}
	if response.Header().Get("Retry-After") == "" {
		t.Fatal("Retry-After header is empty")
	}
}

func TestIPRateLimitTracksClientsIndependently(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(IPRateLimit(1, time.Minute))
	router.POST("/login", func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	first := httptest.NewRecorder()
	firstRequest := httptest.NewRequest(http.MethodPost, "/login", nil)
	firstRequest.RemoteAddr = "192.0.2.20:12345"
	router.ServeHTTP(first, firstRequest)

	second := httptest.NewRecorder()
	secondRequest := httptest.NewRequest(http.MethodPost, "/login", nil)
	secondRequest.RemoteAddr = "192.0.2.21:12345"
	router.ServeHTTP(second, secondRequest)

	if first.Code != http.StatusNoContent || second.Code != http.StatusNoContent {
		t.Fatalf("statuses = %d, %d; want both %d", first.Code, second.Code, http.StatusNoContent)
	}
}
