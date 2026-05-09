package main

import (
	"net/http"
	"testing"
	"time"
)

func TestNewHTTPServerSetsConnectionTimeouts(t *testing.T) {
	server := newHTTPServer(http.NewServeMux(), "3000")

	if server.Addr != ":3000" {
		t.Fatalf("Addr = %q, want %q", server.Addr, ":3000")
	}
	if server.ReadHeaderTimeout != 5*time.Second {
		t.Fatalf("ReadHeaderTimeout = %s, want %s", server.ReadHeaderTimeout, 5*time.Second)
	}
	if server.IdleTimeout != 60*time.Second {
		t.Fatalf("IdleTimeout = %s, want %s", server.IdleTimeout, 60*time.Second)
	}
}
