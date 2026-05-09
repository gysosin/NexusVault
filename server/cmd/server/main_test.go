package main

import (
	"context"
	"net"
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

func TestRunHTTPServerStopsWhenContextIsCanceled(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("Listen() error = %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	server := &http.Server{Handler: http.NewServeMux()}
	done := make(chan error, 1)
	started := make(chan struct{})

	go func() {
		done <- runHTTPServer(ctx, server, func() error {
			close(started)
			return server.Serve(listener)
		})
	}()

	<-started
	cancel()

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("runHTTPServer() error = %v", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("runHTTPServer() did not stop after context cancellation")
	}
}
