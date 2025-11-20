package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"go-server/internal/db"
	"go-server/internal/utils"
)

func DecryptPayload() gin.HandlerFunc {
	return func(c *gin.Context) {
		var body map[string]interface{}
		if err := c.ShouldBindBodyWith(&body, binding.JSON); err == nil {
			if payload, ok := body["payload"].(string); ok {
				decrypted, err := utils.Decrypt(payload)
				if err != nil {
					c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Failed to decrypt payload."})
					return
				}
				
				// Replace body with decrypted JSON
				c.Request.Body = io.NopCloser(strings.NewReader(decrypted))
				c.Request.ContentLength = int64(len(decrypted))
				c.Request.Header.Set("Content-Type", "application/json")
			}
		}
		c.Next()
	}
}

// Note: Gin's ShouldBindBodyWith requires a custom binding or reading body manually.
// A better approach for DecryptPayload in Gin:
// Read body, check if it has "payload", decrypt, set body back.

func DecryptPayloadMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "GET" || c.Request.ContentLength == 0 {
			c.Next()
			return
		}

		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		// Restore body for subsequent reads if we don't decrypt
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

		var rawBody map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &rawBody); err != nil {
			// Not JSON or invalid, just proceed (might be intended)
			c.Next()
			return
		}

		if payload, ok := rawBody["payload"].(string); ok {
			decrypted, err := utils.Decrypt(payload)
			if err != nil {
				c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "Failed to decrypt payload."})
				return
			}
			
			// Replace request body with decrypted content
			c.Request.Body = io.NopCloser(strings.NewReader(decrypted))
			c.Request.ContentLength = int64(len(decrypted))
		}

		c.Next()
	}
}

func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}

		tokenString := parts[1]
		claims, err := utils.VerifyToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		// Check Redis for session validity
		sessionKey := fmt.Sprintf("session:%s", tokenString)
		_, err = db.Redis.Get(context.Background(), sessionKey).Result()
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Session expired or invalid"})
			return
		}

		c.Set("userId", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}
