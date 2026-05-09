package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"

	"go-server/internal/db"

	"github.com/gin-gonic/gin"
)

const (
	maintenanceBannerSettingKey = "maintenanceBanner"
	systemDatabaseTimeout       = 3 * time.Second
)

type maintenanceBannerResponse struct {
	Enabled  bool   `json:"enabled"`
	Message  string `json:"message"`
	Severity string `json:"severity"`
}

var allowedMaintenanceBannerSeverities = map[string]struct{}{
	"info":     {},
	"warning":  {},
	"critical": {},
}

func GetMaintenanceBanner(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), systemDatabaseTimeout)
	defer cancel()

	var raw json.RawMessage
	err := db.DB.GetContext(ctx, &raw, "SELECT value FROM system_settings WHERE key = $1", maintenanceBannerSettingKey)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusOK, defaultMaintenanceBanner())
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch maintenance banner"})
		return
	}

	banner, err := parseMaintenanceBanner(raw)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Maintenance banner setting is invalid"})
		return
	}

	c.JSON(http.StatusOK, banner)
}

func parseMaintenanceBanner(raw json.RawMessage) (maintenanceBannerResponse, error) {
	if len(raw) == 0 {
		return defaultMaintenanceBanner(), nil
	}

	var banner maintenanceBannerResponse
	if err := json.Unmarshal(raw, &banner); err != nil {
		return maintenanceBannerResponse{}, err
	}

	return normalizeMaintenanceBanner(banner), nil
}

func normalizeMaintenanceBanner(banner maintenanceBannerResponse) maintenanceBannerResponse {
	banner.Message = strings.TrimSpace(banner.Message)
	banner.Severity = strings.ToLower(strings.TrimSpace(banner.Severity))
	if _, ok := allowedMaintenanceBannerSeverities[banner.Severity]; !ok {
		banner.Severity = "info"
	}
	if banner.Message == "" {
		banner.Enabled = false
	}
	return banner
}

func defaultMaintenanceBanner() maintenanceBannerResponse {
	return maintenanceBannerResponse{Severity: "info"}
}
