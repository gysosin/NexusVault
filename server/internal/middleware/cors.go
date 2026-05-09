package middleware

import (
	"net/http"

	"go-server/internal/security"

	"github.com/gin-gonic/gin"
)

const corsPreflightMaxAgeSeconds = "600"

// CORSMiddleware sets CORS headers for browser clients and short-circuits OPTIONS requests.
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin != "" {
			c.Writer.Header().Set("Vary", "Origin")
			if !security.IsOriginAllowed(c.Request) {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Origin not allowed"})
				return
			}
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")

		if c.Request.Method == "OPTIONS" {
			c.Writer.Header().Set("Access-Control-Max-Age", corsPreflightMaxAgeSeconds)
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
