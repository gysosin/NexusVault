package security

import "strings"

// BearerToken extracts a bearer token using HTTP's case-insensitive auth scheme rules.
func BearerToken(authHeader string) string {
	parts := strings.Fields(authHeader)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return ""
	}
	return parts[1]
}
