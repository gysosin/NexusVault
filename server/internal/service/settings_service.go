package service

import (
	"encoding/json"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

// UpdateSystemSettings updates the system settings in the database.
func UpdateSystemSettings(tx *sqlx.Tx, req map[string]interface{}) error {
	if len(req) == 0 {
		return nil
	}

	keys := make([]string, 0, len(req))
	values := make([]string, 0, len(req))

	for k, v := range req {
		valJSON, err := json.Marshal(v)
		if err != nil {
			return fmt.Errorf("failed to marshal value for key %s: %w", k, err)
		}
		keys = append(keys, k)
		values = append(values, string(valJSON))
	}

	query := `
		INSERT INTO system_settings (key, value, updated_at)
		SELECT key, value::jsonb, NOW()
		FROM unnest($1::text[], $2::text[]) AS t(key, value)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
	`

	if _, err := tx.Exec(query, pq.Array(keys), pq.Array(values)); err != nil {
		return fmt.Errorf("failed to update settings: %w", err)
	}

	return nil
}
