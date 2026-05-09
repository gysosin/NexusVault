package api

import "testing"

func TestSettingsAuditDetailsRedactsSensitiveValues(t *testing.T) {
	details := settingsAuditDetails(map[string]interface{}{
		"theme":            "dark",
		"apiKey":           "sensitive-value",
		"jwt_secret":       "sensitive-value",
		"credentialSecret": "sensitive-value",
		"sessionToken":     "sensitive-value",
		"passwordPolicy":   "sensitive-value",
	})

	if details["theme"] != "dark" {
		t.Fatalf("theme = %q, want %q", details["theme"], "dark")
	}

	for _, key := range []string{"apiKey", "jwt_secret", "credentialSecret", "sessionToken", "passwordPolicy"} {
		if details[key] != redactedAuditValue {
			t.Fatalf("%s = %q, want redacted value", key, details[key])
		}
	}
}
