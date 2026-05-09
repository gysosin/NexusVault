package api

import (
	"context"
	"net"
	"testing"
	"time"

	"go-server/internal/models"
)

func TestProbeConnectionReportsReachableTCPPort(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	defer listener.Close()

	go func() {
		conn, err := listener.Accept()
		if err == nil {
			_ = conn.Close()
		}
	}()

	port := listener.Addr().(*net.TCPAddr).Port
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	result := probeConnection(ctx, models.Connection{ID: 42, Host: "127.0.0.1", Port: port})
	if result.ConnectionID != 42 {
		t.Fatalf("connection id = %d, want 42", result.ConnectionID)
	}
	if result.Status != "reachable" {
		t.Fatalf("status = %q, want reachable with error %q", result.Status, result.Error)
	}
	if result.Error != "" {
		t.Fatalf("error = %q, want empty", result.Error)
	}
}

func TestProbeConnectionRejectsInvalidPort(t *testing.T) {
	result := probeConnection(context.Background(), models.Connection{ID: 7, Host: "127.0.0.1", Port: 70000})
	if result.Status != "unreachable" {
		t.Fatalf("status = %q, want unreachable", result.Status)
	}
	if result.Error != "Connection port is invalid" {
		t.Fatalf("error = %q, want invalid port message", result.Error)
	}
}
