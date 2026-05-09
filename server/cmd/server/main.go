package main

import (
	apiPkg "go-server/internal/api"
	"go-server/internal/config"
	"go-server/internal/db"
	"go-server/internal/middleware"
	"go-server/internal/service"
	"go-server/internal/utils"
	wsPkg "go-server/internal/websocket"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	println("Starting server...")
	config.InitConfig()
	db.InitDb()
	db.InitRedis()
	service.NotificationHub.InitRedisSub()

	// Cleanup stale sessions
	_, err := db.DB.Exec("UPDATE session_histories SET end_time = NOW(), status = 'terminated' WHERE end_time IS NULL")
	if err != nil {
		utils.Log("Failed to cleanup stale sessions: " + err.Error())
	} else {
		utils.Log("Cleaned up stale sessions")
	}

	r := gin.Default()
	if err := r.SetTrustedProxies(config.Envs.TrustedProxies); err != nil {
		log.Fatalf("Failed to configure trusted proxies: %v", err)
	}

	// Middleware
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.CORSMiddleware())
	r.Use(middleware.DecryptPayloadMiddleware())

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", middleware.IPRateLimit(config.Envs.AuthRateLimitRequests, config.Envs.AuthRateLimitWindow), apiPkg.Register)
			auth.POST("/login", middleware.IPRateLimit(config.Envs.AuthRateLimitRequests, config.Envs.AuthRateLimitWindow), apiPkg.Login)
			auth.POST("/logout", apiPkg.Logout)
			auth.GET("/me", middleware.AuthRequired(), apiPkg.Me)
		}

		connections := api.Group("/connections")
		connections.Use(middleware.AuthRequired())
		{
			connections.GET("/", apiPkg.GetConnections)
			connections.POST("/", apiPkg.CreateConnection)
			connections.PUT("/:id", apiPkg.UpdateConnection)
			connections.DELETE("/:id", apiPkg.DeleteConnection)
		}

		sessions := api.Group("/sessions")
		sessions.Use(middleware.AuthRequired())
		{
			sessions.GET("/active", apiPkg.GetActiveSessions)
			sessions.GET("/history", apiPkg.GetSessionHistory)
			sessions.GET("/history/:sessionId", apiPkg.GetSessionDetails)
		}

		admin := api.Group("/admin")
		admin.Use(middleware.AuthRequired())
		admin.Use(middleware.RequireRole("admin"))
		{
			admin.GET("/settings", apiPkg.GetSystemSettings)
			admin.POST("/settings", apiPkg.UpdateSystemSettings)
			admin.GET("/users", apiPkg.GetUsers)
			admin.POST("/users", apiPkg.CreateUser)
			admin.DELETE("/users/:id", apiPkg.DeleteUser)
			admin.PUT("/users/:id/role", apiPkg.UpdateUserRole)
			admin.GET("/roles", apiPkg.GetRoles)
			admin.POST("/roles", apiPkg.CreateRole)
			admin.DELETE("/roles/:id", apiPkg.DeleteRole)
			admin.GET("/stats", apiPkg.GetAdminStats)
			admin.GET("/activity", apiPkg.GetActivityLogs)
			admin.GET("/sessions", apiPkg.GetAllActiveSessions)
			admin.DELETE("/sessions/:id", apiPkg.TerminateSession)
			admin.POST("/users/:id/logout", apiPkg.LogoutUser)
		}
	}

	// WebSocket
	r.GET("/ws", wsPkg.HandleWebSocket)
	r.GET("/ws/notifications", wsPkg.HandleNotifications)

	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"message": "pong",
		})
	})

	r.GET("/api/health", apiPkg.GetHealthStatus)
	r.GET("/api/ready", apiPkg.GetReadinessStatus)
	registerStaticRoutes(r, staticAssetDir())

	port := config.Envs.Port
	utils.Log("Server running on port " + port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
