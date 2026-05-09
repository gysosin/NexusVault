package utils

import (
	"strings"
	"testing"
)

func TestActivityDetailsJSONFallsBackOnMarshalError(t *testing.T) {
	details := make(chan struct{})

	result := string(activityDetailsJSON(details))
	if !strings.Contains(result, "failed to serialize activity details") {
		t.Fatalf("activityDetailsJSON() = %q, want serialization fallback", result)
	}
}
