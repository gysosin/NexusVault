package utils

import (
	"encoding/json"
	"log"
	"time"

	"go-server/internal/db"
)

func Log(v ...interface{}) {
	log.Println(v...)
}

func Logf(format string, v ...interface{}) {
	log.Printf(format, v...)
}

func LogActivity(userID *int, action, target, status string, details interface{}) {
	// Fire and forget
	go func() {
		if db.DB == nil {
			log.Println("Failed to log activity: database unavailable")
			return
		}

		detailsJSON := activityDetailsJSON(details)
		_, err := db.DB.Exec(`
			INSERT INTO activity_logs (user_id, action, target, status, details, created_at)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, userID, action, target, status, detailsJSON, time.Now())
		if err != nil {
			log.Printf("Failed to log activity: %v", err)
		}
	}()
}

func activityDetailsJSON(details interface{}) []byte {
	detailsJSON, err := json.Marshal(details)
	if err != nil {
		return []byte(`{"error":"failed to serialize activity details"}`)
	}
	return detailsJSON
}
