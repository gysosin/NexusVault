package main

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestRegisterStaticRoutesServesSPAIndex(t *testing.T) {
	gin.SetMode(gin.TestMode)
	distDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(distDir, "index.html"), []byte("spa index"), 0o600); err != nil {
		t.Fatalf("WriteFile(index.html) error = %v", err)
	}

	router := gin.New()
	registerStaticRoutes(router, distDir)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/", nil)

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if response.Body.String() != "spa index" {
		t.Fatalf("body = %q, want %q", response.Body.String(), "spa index")
	}
}

func TestRegisterStaticRoutesDoesNotHandleAPIMisses(t *testing.T) {
	gin.SetMode(gin.TestMode)
	distDir := t.TempDir()
	if err := os.WriteFile(filepath.Join(distDir, "index.html"), []byte("spa index"), 0o600); err != nil {
		t.Fatalf("WriteFile(index.html) error = %v", err)
	}

	router := gin.New()
	registerStaticRoutes(router, distDir)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/missing", nil)

	router.ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotFound)
	}
}

func TestRegisterStaticRoutesServesAssets(t *testing.T) {
	gin.SetMode(gin.TestMode)
	distDir := t.TempDir()
	assetsDir := filepath.Join(distDir, "assets")
	if err := os.Mkdir(assetsDir, 0o700); err != nil {
		t.Fatalf("Mkdir(assets) error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(distDir, "index.html"), []byte("spa index"), 0o600); err != nil {
		t.Fatalf("WriteFile(index.html) error = %v", err)
	}
	if err := os.WriteFile(filepath.Join(assetsDir, "app.js"), []byte("console.log('ok')"), 0o600); err != nil {
		t.Fatalf("WriteFile(app.js) error = %v", err)
	}

	router := gin.New()
	registerStaticRoutes(router, distDir)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/assets/app.js", nil)

	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if response.Body.String() != "console.log('ok')" {
		t.Fatalf("body = %q, want asset body", response.Body.String())
	}
}
