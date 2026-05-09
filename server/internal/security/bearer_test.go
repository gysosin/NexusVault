package security

import "testing"

func TestBearerTokenAcceptsCaseInsensitiveScheme(t *testing.T) {
	got := BearerToken("bearer session-token")
	if got != "session-token" {
		t.Fatalf("BearerToken() = %q, want %q", got, "session-token")
	}
}

func TestBearerTokenRejectsMalformedHeaders(t *testing.T) {
	tests := []string{
		"",
		"Bearer",
		"Bearer token extra",
		"Basic token",
	}

	for _, header := range tests {
		if got := BearerToken(header); got != "" {
			t.Fatalf("BearerToken(%q) = %q, want empty string", header, got)
		}
	}
}
