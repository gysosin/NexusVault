package main

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
)

func staticAssetDir() string {
	if configured := strings.TrimSpace(os.Getenv("STATIC_ASSET_DIR")); configured != "" {
		return configured
	}

	for _, candidate := range []string{"client/dist", "../client/dist", "/app/client/dist"} {
		if info, err := os.Stat(candidate); err == nil && info.IsDir() {
			return candidate
		}
	}

	return ""
}

func registerStaticRoutes(r *gin.Engine, distDir string) {
	if distDir == "" {
		return
	}

	indexPath := filepath.Join(distDir, "index.html")
	if info, err := os.Stat(indexPath); err != nil || info.IsDir() {
		return
	}

	assetsDir := filepath.Join(distDir, "assets")
	if info, err := os.Stat(assetsDir); err == nil && info.IsDir() {
		r.Static("/assets", assetsDir)
	}

	r.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api") || strings.HasPrefix(path, "/ws") {
			c.Status(http.StatusNotFound)
			return
		}
		c.File(indexPath)
	})
}
