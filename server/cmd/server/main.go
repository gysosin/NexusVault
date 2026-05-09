package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	apiPkg "go-server/internal/api"
	"go-server/internal/config"
	"go-server/internal/db"
	"go-server/internal/middleware"
	"go-server/internal/service"
	"go-server/internal/utils"
	wsPkg "go-server/internal/websocket"

	"github.com/gin-gonic/gin"
)

const startupMaintenanceTimeout = 5 * time.Second
const readHeaderTimeout = 5 * time.Second
const idleConnectionTimeout = 60 * time.Second
const shutdownTimeout = 10 * time.Second

func main() {
	utils.Log("Starting server...")
	config.InitConfig()
	db.InitDb()
	db.InitRedis()
	service.NotificationHub.InitRedisSub()

	// Cleanup stale sessions
	ctx, cancel := context.WithTimeout(context.Background(), startupMaintenanceTimeout)
	_, err := db.DB.ExecContext(ctx, "UPDATE session_histories SET end_time = NOW(), status = 'terminated' WHERE end_time IS NULL")
	cancel()
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
	server := newHTTPServer(r, port)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	if err := runHTTPServer(ctx, server, server.ListenAndServe); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func newHTTPServer(handler http.Handler, port string) *http.Server {
	return &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: readHeaderTimeout,
		IdleTimeout:       idleConnectionTimeout,
	}
}

func runHTTPServer(ctx context.Context, server *http.Server, serve func() error) error {
	errCh := make(chan error, 1)
	go func() {
		errCh <- serve()
	}()

	select {
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			return err
		}

		select {
		case err := <-errCh:
			if errors.Is(err, http.ErrServerClosed) {
				return nil
			}
			return err
		case <-shutdownCtx.Done():
			return shutdownCtx.Err()
		}
	}
}
