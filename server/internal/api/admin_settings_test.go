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

func TestNormalizeMaintenanceBanner(t *testing.T) {
	banner := normalizeMaintenanceBanner(maintenanceBannerResponse{
		Enabled:  true,
		Message:  "  Planned maintenance tonight at 22:00 UTC.  ",
		Severity: "critical",
	})

	if !banner.Enabled {
		t.Fatal("banner should remain enabled when a message is present")
	}
	if banner.Message != "Planned maintenance tonight at 22:00 UTC." {
		t.Fatalf("message = %q, want trimmed message", banner.Message)
	}
	if banner.Severity != "critical" {
		t.Fatalf("severity = %q, want critical", banner.Severity)
	}
}

func TestNormalizeMaintenanceBannerDisablesBlankMessageAndDefaultsSeverity(t *testing.T) {
	banner := normalizeMaintenanceBanner(maintenanceBannerResponse{
		Enabled:  true,
		Message:  "   ",
		Severity: "urgent",
	})

	if banner.Enabled {
		t.Fatal("blank banner message should disable the banner")
	}
	if banner.Message != "" {
		t.Fatalf("message = %q, want empty message", banner.Message)
	}
	if banner.Severity != "info" {
		t.Fatalf("severity = %q, want info", banner.Severity)
	}
}
