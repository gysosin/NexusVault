package security

import (
	"net"
	"net/http"
	"net/url"
	"strings"

	"go-server/internal/config"
)

// IsOriginAllowed enforces browser origin checks for CORS and WebSocket upgrades.
// Non-browser clients often omit Origin; those requests are allowed and still rely
// on authentication.
func IsOriginAllowed(r *http.Request) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		return true
	}

	originURL, err := url.Parse(origin)
	if err != nil || originURL.Scheme == "" || originURL.Host == "" {
		return false
	}

	if sameHost(originURL.Host, r.Host) {
		return true
	}

	if isConfiguredOriginAllowed(originURL) {
		return true
	}

	return config.Envs.NodeEnv == "development" && isLoopbackHost(originURL.Hostname())
}

func isConfiguredOriginAllowed(originURL *url.URL) bool {
	for _, allowed := range strings.Split(config.Envs.AllowedOrigins, ",") {
		allowed = strings.TrimSpace(allowed)
		if allowed == "" {
			continue
		}
		if allowed == "*" {
			return config.Envs.NodeEnv == "development"
		}

		allowedURL, err := url.Parse(allowed)
		if err != nil || allowedURL.Scheme == "" || allowedURL.Host == "" {
			continue
		}

		if strings.EqualFold(allowedURL.Scheme, originURL.Scheme) && sameHost(allowedURL.Host, originURL.Host) {
			return true
		}
	}
	return false
}

func sameHost(a, b string) bool {
	return strings.EqualFold(canonicalHostPort(a), canonicalHostPort(b))
}

func canonicalHostPort(value string) string {
	value = strings.TrimSpace(strings.ToLower(value))
	if value == "" {
		return ""
	}

	host, port, err := net.SplitHostPort(value)
	if err != nil {
		return strings.Trim(value, "[]")
	}

	host = strings.Trim(host, "[]")
	switch port {
	case "80", "443":
		return host
	default:
		return host + ":" + port
	}
}

func isLoopbackHost(host string) bool {
	host = strings.Trim(strings.ToLower(host), "[]")
	if host == "localhost" {
		return true
	}
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
