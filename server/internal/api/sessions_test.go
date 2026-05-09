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

func TestParseSessionHistoryLimit(t *testing.T) {
	tests := []struct {
		name    string
		raw     string
		want    int
		wantErr bool
	}{
		{name: "default", raw: "", want: defaultSessionHistoryLimit},
		{name: "custom", raw: "5", want: 5},
		{name: "capped", raw: "500", want: maxSessionHistoryLimit},
		{name: "invalid", raw: "abc", wantErr: true},
		{name: "zero", raw: "0", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseSessionHistoryLimit(tt.raw)
			if tt.wantErr {
				if err == nil {
					t.Fatal("parseSessionHistoryLimit() error = nil, want error")
				}
				return
			}
			if err != nil {
				t.Fatalf("parseSessionHistoryLimit() error = %v", err)
			}
			if got != tt.want {
				t.Fatalf("parseSessionHistoryLimit() = %d, want %d", got, tt.want)
			}
		})
	}
}
