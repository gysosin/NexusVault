package websocket

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestHandleNotificationsRejectsMissingTokenBeforeUpgrade(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/ws/notifications", HandleNotifications)

	request := httptest.NewRequest(http.MethodGet, "/ws/notifications", nil)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
}

func TestOptionalConnectionID(t *testing.T) {
	if got := optionalConnectionID(0); got != nil {
		t.Fatalf("optionalConnectionID(0) = %v, want nil", *got)
	}

	got := optionalConnectionID(42)
	if got == nil {
		t.Fatal("optionalConnectionID(42) = nil, want pointer")
	}
	if *got != 42 {
		t.Fatalf("optionalConnectionID(42) = %d, want 42", *got)
	}
}

func TestHandleNotificationsRejectsInvalidTokenBeforeUpgrade(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/ws/notifications", HandleNotifications)

	request := httptest.NewRequest(http.MethodGet, "/ws/notifications?token=not-a-jwt", nil)
	response := httptest.NewRecorder()

	router.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
}
