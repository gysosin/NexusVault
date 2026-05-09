package api

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"go-server/internal/db"
	"go-server/internal/models"
	"go-server/internal/service"
	"go-server/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

var roleIDPattern = regexp.MustCompile(`^[a-z][a-z0-9_]{0,49}$`)

const (
	adminDatabaseTimeout    = 3 * time.Second
	adminSessionScanCount   = 100
	adminSessionScanTimeout = 3 * time.Second
	redactedAuditValue      = "[redacted]"
)

var allowedRolePermissions = map[string]struct{}{
	"manage_users":       {},
	"manage_roles":       {},
	"manage_connections": {},
	"share_connections":  {},
	"view_audit":         {},
}

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

	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	var settings []models.SystemSetting
	err := db.DB.SelectContext(ctx, &settings, "SELECT * FROM system_settings")
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	tx, err := db.DB.BeginTxx(ctx, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
		return
	}

	for key, val := range req {
		valJSON, err := json.Marshal(val)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid setting value: " + key})
			return
		}

		if _, err := tx.ExecContext(ctx, `
			INSERT INTO system_settings (key, value, updated_at) 
			VALUES ($1, $2, NOW()) 
			ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
		`, key, valJSON); err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update setting: " + key})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit changes"})
		return
	}

	userID := c.GetInt("userId")
	utils.LogActivity(&userID, "Update Settings", "System", "Success", settingsAuditDetails(req))

	GetSystemSettings(c)
}

func settingsAuditDetails(settings map[string]interface{}) map[string]interface{} {
	details := make(map[string]interface{}, len(settings))
	for key, value := range settings {
		if isSensitiveSettingKey(key) {
			details[key] = redactedAuditValue
			continue
		}
		details[key] = value
	}
	return details
}

func isSensitiveSettingKey(key string) bool {
	normalized := strings.ToLower(strings.TrimSpace(key))
	return strings.Contains(normalized, "secret") ||
		strings.Contains(normalized, "token") ||
		strings.Contains(normalized, "password") ||
		strings.Contains(normalized, "credential") ||
		strings.Contains(normalized, "privatekey") ||
		strings.Contains(normalized, "private_key") ||
		strings.Contains(normalized, "apikey") ||
		strings.Contains(normalized, "api_key")
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
	dbCtx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	if err := db.DB.GetContext(dbCtx, &stats.Users, "SELECT COUNT(*) FROM users"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user count"})
		return
	}
	if err := db.DB.GetContext(dbCtx, &stats.Connections, "SELECT COUNT(*) FROM connections"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch connection count"})
		return
	}
	if err := db.DB.GetContext(dbCtx, &stats.ActiveSessions, "SELECT COUNT(*) FROM session_histories WHERE end_time IS NULL"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active session count"})
		return
	}

	if db.Redis != nil {
		redisCtx, cancel := context.WithTimeout(c.Request.Context(), adminSessionScanTimeout)
		defer cancel()

		loggedInUsers, err := countRedisSessionKeys(redisCtx)
		if err != nil {
			utils.Log("Failed to count logged-in users", err)
		} else {
			stats.LoggedInUsers = loggedInUsers
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	var logs []activityLogResponse
	query := `
		SELECT al.id, al.user_id, u.username, al.action, al.target, al.status, al.details, to_char(al.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
		FROM activity_logs al
		LEFT JOIN users u ON u.id = al.user_id
		ORDER BY al.created_at DESC
		LIMIT 200
	`
	if err := db.DB.SelectContext(ctx, &logs, query); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activity logs"})
		return
	}

	c.JSON(http.StatusOK, logs)
}

func GetUsers(c *gin.Context) {
	if !ensureAdmin(c) {
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	var users []models.User
	err := db.DB.SelectContext(ctx, &users, "SELECT id, username, email, role, created_at FROM users ORDER BY id")
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
	if err := validateAccountPassword(req.Password); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !isAssignableUserRole(req.Role) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported user role"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	var user models.User
	query := `INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at`
	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	if err := db.DB.QueryRowxContext(ctx, query, req.Username, req.Email, string(hashedPassword), req.Role).StructScan(&user); err != nil {
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	result, err := db.DB.ExecContext(ctx, "DELETE FROM users WHERE id = $1", id)
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
	if !isAssignableUserRole(req.Role) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported user role"})
		return
	}

	var user models.User
	query := `UPDATE users SET role = $1 WHERE id = $2 RETURNING id, username, email, role, created_at`
	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	if err := db.DB.QueryRowxContext(ctx, query, req.Role, id).StructScan(&user); err != nil {
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	var roles []models.Role
	err := db.DB.SelectContext(ctx, &roles, "SELECT id, name, description, permissions, created_at FROM roles ORDER BY created_at DESC")
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
	if err := normalizeCreateRoleRequest(&req); err != nil {
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
	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	if err := db.DB.QueryRowxContext(ctx, query, req.ID, req.Name, req.Description, val).StructScan(&role); err != nil {
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
	if isSystemRole(id) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "System roles cannot be deleted"})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	result, err := db.DB.ExecContext(ctx, "DELETE FROM roles WHERE id = $1", id)
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

func normalizeCreateRoleRequest(req *createRoleRequest) error {
	req.ID = strings.ToLower(strings.TrimSpace(req.ID))
	req.Name = strings.TrimSpace(req.Name)
	req.Description = strings.TrimSpace(req.Description)

	if !roleIDPattern.MatchString(req.ID) {
		return fmt.Errorf("role id must start with a letter and contain only lowercase letters, numbers, or underscores")
	}
	if req.Name == "" {
		return fmt.Errorf("role name is required")
	}

	for _, permission := range req.Permissions {
		if _, ok := allowedRolePermissions[permission]; !ok {
			return fmt.Errorf("unsupported permission %q", permission)
		}
	}

	return nil
}

func isSystemRole(id string) bool {
	switch id {
	case "admin", "user", "viewer":
		return true
	default:
		return false
	}
}

func isAssignableUserRole(role string) bool {
	return isSystemRole(role)
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

	ctx, cancel := context.WithTimeout(c.Request.Context(), adminSessionScanTimeout)
	defer cancel()

	revoked, err := revokeRedisSessionsForUser(ctx, id)
	if err != nil {
		utils.Log("Failed to revoke user sessions", err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Session store unavailable"})
		return
	}

	adminID := c.GetInt("userId")
	utils.LogActivity(&adminID, "Logout User", idStr, "Success", nil)

	c.JSON(http.StatusOK, gin.H{"message": "User logged out", "sessionsRevoked": revoked})
}

func countRedisSessionKeys(ctx context.Context) (int, error) {
	if db.Redis == nil {
		return 0, nil
	}

	count := 0
	iter := db.Redis.Scan(ctx, 0, "session:*", adminSessionScanCount).Iterator()
	for iter.Next(ctx) {
		count++
	}

	return count, iter.Err()
}

func revokeRedisSessionsForUser(ctx context.Context, userID int) (int, error) {
	if db.Redis == nil {
		return 0, errors.New("session store unavailable")
	}

	revoked := 0
	keys := make([]string, 0, adminSessionScanCount)

	iter := db.Redis.Scan(ctx, 0, "session:*", adminSessionScanCount).Iterator()
	for iter.Next(ctx) {
		key := iter.Val()
		val, err := db.Redis.Get(ctx, key).Int()
		if err != nil {
			if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
				return revoked, err
			}
			continue
		}
		if val != userID {
			continue
		}

		keys = append(keys, key)
		if len(keys) == cap(keys) {
			deleted, err := db.Redis.Del(ctx, keys...).Result()
			if err != nil {
				return revoked, err
			}
			revoked += int(deleted)
			keys = keys[:0]
		}
	}
	if err := iter.Err(); err != nil {
		return revoked, err
	}
	if len(keys) == 0 {
		return revoked, nil
	}

	deleted, err := db.Redis.Del(ctx, keys...).Result()
	if err != nil {
		return revoked, err
	}

	return revoked + int(deleted), nil
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
	ctx, cancel := context.WithTimeout(c.Request.Context(), adminDatabaseTimeout)
	defer cancel()

	result, err := db.DB.ExecContext(ctx, "UPDATE session_histories SET end_time = NOW(), status = 'terminated' WHERE session_id = $1 AND end_time IS NULL", sessionID)
	if err != nil {
		utils.Log("Failed to update session history:", err)
	} else {
		rows, _ := result.RowsAffected()
		utils.Log("Updated session history for ID:", sessionID, "Rows affected:", rows)
	}

	adminID := c.GetInt("userId")
	utils.LogActivity(&adminID, "Terminate Session", sessionID, "Success", nil)

	c.Status(http.StatusNoContent)
}
