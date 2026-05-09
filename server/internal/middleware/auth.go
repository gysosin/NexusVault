package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gin-gonic/gin/binding"
	"go-server/internal/db"
	"go-server/internal/utils"
)

const sessionStoreTimeout = 2 * time.Second

func DecryptPayload() gin.HandlerFunc {
	return func(c *gin.Context) {
		var body map[string]interface{}
		if err := c.ShouldBindBodyWith(&body, binding.JSON); err == nil {
			if payload, ok := body["payload"].(string); ok {
				decrypted, err := utils.DecryptPayload(payload)
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
			decrypted, err := utils.DecryptPayload(payload)
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
		claims, err := AuthenticateToken(bearerToken(c.GetHeader("Authorization")))
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			return
		}

		c.Set("userId", claims.UserID)
		c.Set("role", claims.Role)
		c.Next()
	}
}

func TokenFromRequest(r *http.Request) string {
	if r == nil {
		return ""
	}

	if token := bearerToken(r.Header.Get("Authorization")); token != "" {
		return token
	}

	if token := strings.TrimSpace(r.URL.Query().Get("token")); token != "" {
		return token
	}

	return strings.TrimSpace(r.URL.Query().Get("access_token"))
}

func AuthenticateToken(tokenString string) (*utils.Claims, error) {
	tokenString = strings.TrimSpace(tokenString)
	if tokenString == "" {
		return nil, errors.New("token required")
	}

	claims, err := utils.VerifyToken(tokenString)
	if err != nil {
		return nil, err
	}

	if db.Redis == nil {
		return nil, errors.New("session store unavailable")
	}

	ctx, cancel := context.WithTimeout(context.Background(), sessionStoreTimeout)
	defer cancel()

	sessionKey := fmt.Sprintf("session:%s", tokenString)
	if _, err := db.Redis.Get(ctx, sessionKey).Result(); err != nil {
		return nil, err
	}

	return claims, nil
}

func bearerToken(authHeader string) string {
	parts := strings.Fields(authHeader)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}
