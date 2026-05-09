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
	c.JSON(http.StatusOK, collectHealthStatus(c))
}

func GetReadinessStatus(c *gin.Context) {
	status := collectHealthStatus(c)
	if status.Status != "operational" {
		c.JSON(http.StatusServiceUnavailable, status)
		return
	}

	c.JSON(http.StatusOK, status)
}

func collectHealthStatus(c *gin.Context) HealthStatus {
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

	return status
}
