package api

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"go-server/internal/config"
	"go-server/internal/db"
	"go-server/internal/models"
	"go-server/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

type RegisterRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password" binding:"required"`
}

const minAccountPasswordLength = 8
const loginSessionStoreTimeout = 2 * time.Second

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := normalizeRegisterRequest(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := validateAccountPassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existingUserCount int
	if err := db.DB.Get(&existingUserCount, "SELECT COUNT(*) FROM users"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to validate registration policy."})
		return
	}

	decision := registrationDecision(config.Envs.AllowPublicRegistration, existingUserCount)
	if !decision.Allowed {
		c.JSON(http.StatusForbidden, gin.H{"error": "Public registration is disabled."})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	var user models.User
	query := `INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role`
	err = db.DB.QueryRowx(query, req.Username, req.Email, string(hashedPassword), decision.Role).StructScan(&user)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "Username or email already in use."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Unable to create account."})
		return
	}

	utils.LogActivity(nil, "Register", user.Username, "Success", nil)

	c.JSON(http.StatusCreated, gin.H{"user": user})
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	identifier := strings.TrimSpace(req.Username)
	if identifier == "" {
		identifier = strings.TrimSpace(req.Email)
	}

	if identifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identifier (username or email) required"})
		return
	}

	var user models.User
	query := `SELECT id, username, email, password, role FROM users WHERE username = $1 OR email = $2 LIMIT 1`
	err := db.DB.Get(&user, query, identifier, strings.ToLower(identifier))

	if err == sql.ErrNoRows {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials."})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials."})
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	if err := persistLoginSession(c.Request.Context(), token, user.ID, 24*time.Hour); err != nil {
		utils.Log("Failed to store session in Redis", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Session store unavailable."})
		return
	}

	// Log activity
	utils.LogActivity(&user.ID, "Login", "System", "Success", nil)

	c.JSON(http.StatusOK, gin.H{
		"token":     token,
		"expiresIn": "24h",
		"user":      user,
	})
}

func normalizeRegisterRequest(req *RegisterRequest) error {
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	if req.Username == "" {
		return errors.New("username is required")
	}
	if req.Email == "" {
		return errors.New("email is required")
	}

	return nil
}

func validateAccountPassword(password string) error {
	if utf8.RuneCountInString(password) < minAccountPasswordLength {
		return fmt.Errorf("password must be at least %d characters", minAccountPasswordLength)
	}

	return nil
}

func Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") && db.Redis != nil {
		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if token == "" {
			c.Status(http.StatusNoContent)
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), loginSessionStoreTimeout)
		defer cancel()

		sessionKey := fmt.Sprintf("session:%s", token)
		if err := db.Redis.Del(ctx, sessionKey).Err(); err != nil {
			utils.Log("Failed to delete session from Redis", err)
		}
	}
	c.Status(http.StatusNoContent)
}

func persistLoginSession(ctx context.Context, token string, userID int, ttl time.Duration) error {
	if db.Redis == nil {
		return errors.New("session store unavailable")
	}

	ctx, cancel := context.WithTimeout(ctx, loginSessionStoreTimeout)
	defer cancel()

	sessionKey := fmt.Sprintf("session:%s", token)
	return db.Redis.Set(ctx, sessionKey, userID, ttl).Err()
}

func Me(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var user models.User
	query := `SELECT id, username, email, role, created_at FROM users WHERE id = $1`
	err := db.DB.Get(&user, query, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}
