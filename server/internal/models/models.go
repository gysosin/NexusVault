package models

import (
	"database/sql"
	"encoding/json"
	"time"
)

type User struct {
	ID        int       `db:"id" json:"id"`
	Username  string    `db:"username" json:"username"`
	Email     string    `db:"email" json:"email"`
	Password  string    `db:"password" json:"-"`
	Role      string    `db:"role" json:"role"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
}

type Connection struct {
	ID        int       `db:"id" json:"id"`
	UserID    int       `db:"user_id" json:"userId"`
	Name      string    `db:"name" json:"name"`
	Host      string    `db:"host" json:"host"`
	Port      int       `db:"port" json:"port"`
	Username  string    `db:"username" json:"username"`
	Password  string    `db:"password" json:"-"` // Encrypted
	Type      string    `db:"type" json:"type"`
	CreatedAt time.Time `db:"created_at" json:"createdAt"`
}

type ActivityLog struct {
	ID        int             `db:"id" json:"id"`
	UserID    *int            `db:"user_id" json:"userId"`
	Action    string          `db:"action" json:"action"`
	Target    string          `db:"target" json:"target"`
	Status    string          `db:"status" json:"status"`
	Details   json.RawMessage `db:"details" json:"details"`
	CreatedAt time.Time       `db:"created_at" json:"createdAt"`
}

type SessionHistory struct {
	ID           int        `db:"id" json:"id"`
	UserID       int        `db:"user_id" json:"userId"`
	ConnectionID *int       `db:"connection_id" json:"connectionId"`
	SessionID    string     `db:"session_id" json:"sessionId"`
	Host         string     `db:"host" json:"host"`
	Username     string     `db:"username" json:"username"`
	StartTime    time.Time  `db:"start_time" json:"startTime"`
	EndTime      *time.Time `db:"end_time" json:"endTime"`
	LogContent   string     `db:"log_content" json:"logContent"`
	Status       string     `db:"status" json:"status"`
}

type Role struct {
	ID          string          `db:"id" json:"id"`
	Name        string          `db:"name" json:"name"`
	Description string          `db:"description" json:"description"`
	Permissions json.RawMessage `db:"permissions" json:"permissions"`
	CreatedAt   time.Time       `db:"created_at" json:"createdAt"`
}

type SystemSetting struct {
	Key       string          `db:"key" json:"key"`
	Value     json.RawMessage `db:"value" json:"value"`
	UpdatedAt time.Time       `db:"updated_at" json:"updatedAt"`
}

// NullInt32 helper for sqlx if needed, though *int usually works with sqlx
type NullInt32 struct {
	sql.NullInt32
}
