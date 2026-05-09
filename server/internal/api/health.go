package api

import (
	"context"
	"net/http"
	"time"

	"go-server/internal/db"

	"github.com/gin-gonic/gin"
)

type HealthStatus struct {
	Status   string `json:"status"`
	Database string `json:"database"`
	Redis    string `json:"redis"`
}

const healthDependencyTimeout = 2 * time.Second

func GetHealthStatus(c *gin.Context) {
	status := HealthStatus{
		Status:   "operational",
		Database: "operational",
		Redis:    "operational",
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), healthDependencyTimeout)
	defer cancel()

	if db.DB == nil || db.DB.PingContext(ctx) != nil {
		status.Database = "down"
		status.Status = "degraded"
	}

	if db.Redis == nil || db.Redis.Ping(ctx).Err() != nil {
		status.Redis = "down"
		status.Status = "degraded"
	}

	if status.Database == "down" && status.Redis == "down" {
		status.Status = "down"
	}

	c.JSON(http.StatusOK, status)
}
