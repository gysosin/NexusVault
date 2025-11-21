package api

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

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

func Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	var user models.User
	query := `INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, role`
	err = db.DB.QueryRowx(query, req.Username, req.Email, string(hashedPassword)).StructScan(&user)

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

	// Store in Redis
	sessionKey := fmt.Sprintf("session:%s", token)
	err = db.Redis.Set(context.Background(), sessionKey, user.ID, 24*time.Hour).Err()
	if err != nil {
		utils.Log("Failed to store session in Redis", err)
		// Continue anyway? Or fail? Node.js logs it.
	}

	// Log activity
	utils.LogActivity(&user.ID, "Login", "System", "Success", nil)

	c.JSON(http.StatusOK, gin.H{
		"token":     token,
		"expiresIn": "24h",
		"user":      user,
	})
}

func Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		token := strings.TrimPrefix(authHeader, "Bearer ")
		sessionKey := fmt.Sprintf("session:%s", token)
		db.Redis.Del(context.Background(), sessionKey)
	}
	c.Status(http.StatusNoContent)
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
