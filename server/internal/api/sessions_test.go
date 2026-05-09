package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGetSessionHistoryRejectsInvalidConnectionID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.GET("/api/sessions/history", func(c *gin.Context) {
		c.Set("userId", 1)
		GetSessionHistory(c)
	})

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/sessions/history?connectionId=abc", nil)
	router.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
	}
}
