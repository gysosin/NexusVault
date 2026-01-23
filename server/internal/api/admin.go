package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"

	"go-server/internal/db"
	"go-server/internal/models"
	"go-server/internal/service"
	"go-server/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

func ensureAdmin(c *gin.Context) bool {
	roleValue, exists := c.Get("role")
	if !exists {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return false
	}
	role, ok := roleValue.(string)
	if !ok || role != "admin" {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
		return false
	}
	return true
}

func GetSystemSettings(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	var settings []models.SystemSetting
	err := db.DB.Select(&settings, "SELECT * FROM system_settings")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settings"})
		return
	}

	response := make(map[string]interface{})
	for _, s := range settings {
		var val interface{}
		if err := json.Unmarshal(s.Value, &val); err != nil {
			continue
		}
		response[s.Key] = val
	}

	c.JSON(http.StatusOK, response)
}

func UpdateSystemSettings(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx, err := db.DB.Beginx()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	if err := service.UpdateSystemSettings(tx, req); err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	userID := c.GetInt("userId")
	utils.LogActivity(&userID, "Update Settings", "System", "Success", req)

	GetSystemSettings(c)
}

func GetAdminStats(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	type statsResponse struct {
		Users          int `json:"users"`
		Connections    int `json:"connections"`
		ActiveSessions int `json:"activeSessions"`
		LoggedInUsers  int `json:"loggedInUsers"`
	}

	var stats statsResponse

	if err := db.DB.Get(&stats.Users, "SELECT COUNT(*) FROM users"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user count"})
		return
	}
	if err := db.DB.Get(&stats.Connections, "SELECT COUNT(*) FROM connections"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connection count"})
		return
	}
	if err := db.DB.Get(&stats.ActiveSessions, "SELECT COUNT(*) FROM session_histories WHERE end_time IS NULL"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active session count"})
		return
	}

	if db.Redis != nil {
		keys, err := db.Redis.Keys(context.Background(), "session:*").Result()
		if err == nil {
			stats.LoggedInUsers = len(keys)
		}
	}

	c.JSON(http.StatusOK, stats)
}

type activityLogResponse struct {
	ID        int             `db:"id" json:"id"`
	UserID    *int            `db:"user_id" json:"userId"`
	Username  *string         `db:"username" json:"username"`
	Action    string          `db:"action" json:"action"`
	Target    string          `db:"target" json:"target"`
	Status    string          `db:"status" json:"status"`
	Details   json.RawMessage `db:"details" json:"details"`
	CreatedAt string          `db:"created_at" json:"created_at"`
}

func GetActivityLogs(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	var logs []activityLogResponse
	query := `
		SELECT al.id, al.user_id, u.username, al.action, al.target, al.status, al.details, to_char(al.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
		FROM activity_logs al
		LEFT JOIN users u ON u.id = al.user_id
		ORDER BY al.created_at DESC
		LIMIT 200
	`
	if err := db.DB.Select(&logs, query); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activity logs"})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func GetUsers(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	var users []models.User
	err := db.DB.Select(&users, "SELECT id, username, email, role, created_at FROM users ORDER BY id")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, users)
}

type createUserRequest struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role" binding:"required"`
}

func CreateUser(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	var req createUserRequest
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
	query := `INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at`
	if err := db.DB.QueryRowx(query, req.Username, req.Email, string(hashedPassword), req.Role).StructScan(&user); err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	userID := c.GetInt("userId")
	utils.LogActivity(&userID, "Create User", user.Username, "Success", nil)

	c.JSON(http.StatusCreated, user)
}

func DeleteUser(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	result, err := db.DB.Exec("DELETE FROM users WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.Status(http.StatusNoContent)
}

type updateUserRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

func UpdateUserRole(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req updateUserRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	query := `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role, created_at`
	if err := db.DB.QueryRowx(query, req.Role, id).StructScan(&user); err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user role"})
		return
	}

	userID := c.GetInt("userId")
	utils.LogActivity(&userID, "Update Role", user.Username, "Success", map[string]string{"role": req.Role})

	c.JSON(http.StatusOK, user)
}

func GetRoles(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	var roles []models.Role
	err := db.DB.Select(&roles, "SELECT id, name, description, permissions, created_at FROM roles ORDER BY created_at DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch roles"})
		return
	}
	c.JSON(http.StatusOK, roles)
}

type createRoleRequest struct {
	ID          string   `json:"id" binding:"required"`
	Name        string   `json:"name" binding:"required"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

func CreateRole(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	var req createRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	perms := req.Permissions
	if perms == nil {
		perms = []string{}
	}

	val, _ := json.Marshal(perms)

	var role models.Role
	query := `
		INSERT INTO roles (id, name, description, permissions, created_at) 
		VALUES ($1, $2, $3, $4, NOW()) 
		RETURNING id, name, description, permissions, created_at
	`
	if err := db.DB.QueryRowx(query, req.ID, req.Name, req.Description, val).StructScan(&role); err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			c.JSON(http.StatusConflict, gin.H{"error": "Role already exists"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create role"})
		return
	}

	c.JSON(http.StatusCreated, role)
}

func DeleteRole(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role ID required"})
		return
	}

	result, err := db.DB.Exec("DELETE FROM roles WHERE id = $1", id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete role"})
		return
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Role not found"})
		return
	}

	c.Status(http.StatusNoContent)
}

// PromoteUser (Example admin action)
func PromoteUser(c *gin.Context) {
	c.Status(http.StatusNotImplemented)
}

func LogoutUser(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Invalidate sessions in Redis
	// We need to find keys for this user.
	// Redis keys are session:token. Value is userID.
	// This is inefficient without a reverse index or scanning.
	// For now, let's scan.
	var keys []string
	iter := db.Redis.Scan(context.Background(), 0, "session:*", 0).Iterator()
	for iter.Next(context.Background()) {
		key := iter.Val()
		val, err := db.Redis.Get(context.Background(), key).Int()
		if err == nil && val == id {
			keys = append(keys, key)
		}
	}

	if len(keys) > 0 {
		db.Redis.Del(context.Background(), keys...)
	}

	adminID := c.GetInt("userId")
	utils.LogActivity(&adminID, "Logout User", idStr, "Success", nil)

	c.JSON(http.StatusOK, gin.H{"message": "User logged out", "sessionsRevoked": len(keys)})
}

func GetAllActiveSessions(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	sessions := service.GetAllSessions()

	type AdminSessionResponse struct {
		ID           string `json:"ID"`
		Host         string `json:"Host"`
		Username     string `json:"Username"`
		Port         int    `json:"Port"`
		ConnectionID *int   `json:"ConnectionID"`
		Protocol     string `json:"Protocol"`
		Type         string `json:"Type"`
		CreatedAt    string `json:"CreatedAt"`
		LastActivity string `json:"LastActivity"`
	}

	var response []AdminSessionResponse
	for _, s := range sessions {
		response = append(response, AdminSessionResponse{
			ID:           s.ID,
			Host:         s.Host,
			Username:     s.Username,
			Port:         s.Port,
			ConnectionID: s.ConnectionID,
			Protocol:     string(s.Type),
			Type:         string(s.Type),
			CreatedAt:    s.CreatedAt.Format("2006-01-02T15:04:05.000Z"),
			LastActivity: s.LastActivity.Format("2006-01-02T15:04:05.000Z"),
		})
	}

	c.JSON(http.StatusOK, response)
}

func TerminateSession(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	sessionID := c.Param("id")
	utils.Log("TerminateSession called for ID:", sessionID)
	service.CloseSession(sessionID)

	// Update DB history
	result, err := db.DB.Exec("UPDATE session_histories SET end_time = NOW(), status = 'terminated' WHERE session_id = $1 AND end_time IS NULL", sessionID)
	if err != nil {
		utils.Log("Failed to update session history:", err)
	} else {
		rows, _ := result.RowsAffected()
		utils.Log("Updated session history for ID:", sessionID, "Rows affected:", rows)
	}
	if err != nil {
		utils.Log("Failed to update session history for termination:", err)
	}

	adminID := c.GetInt("userId")
	utils.LogActivity(&adminID, "Terminate Session", sessionID, "Success", nil)

	c.Status(http.StatusNoContent)
}
