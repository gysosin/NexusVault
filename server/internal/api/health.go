package api

import (
	"context"
	"net/http"

	"go-server/internal/db"

	"github.com/gin-gonic/gin"
)

type HealthStatus struct {
	Status   string `json:"status"`
	Database string `json:"database"`
	Redis    string `json:"redis"`
}

func GetHealthStatus(c *gin.Context) {
	status := HealthStatus{
		Status:   "operational",
		Database: "operational",
		Redis:    "operational",
	}

	// Check Database
	if err := db.DB.Ping(); err != nil {
		status.Database = "down"
		status.Status = "degraded"
	}

	// Check Redis
	if err := db.Redis.Ping(context.Background()).Err(); err != nil {
		status.Redis = "down"
		status.Status = "degraded"
	}

	if status.Database == "down" && status.Redis == "down" {
		status.Status = "down"
	}

	c.JSON(http.StatusOK, status)
}
