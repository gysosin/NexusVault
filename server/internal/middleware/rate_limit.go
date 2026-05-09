package middleware

import (
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type rateLimitBucket struct {
	count      int
	windowEnds time.Time
}

// IPRateLimit applies a fixed-window request limit per client IP.
func IPRateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
	if maxRequests <= 0 || window <= 0 {
		return func(c *gin.Context) {
			c.Next()
		}
	}

	var mu sync.Mutex
	buckets := make(map[string]rateLimitBucket)

	return func(c *gin.Context) {
		now := time.Now()
		key := c.ClientIP()

		mu.Lock()
		bucket := buckets[key]
		if bucket.windowEnds.IsZero() || now.After(bucket.windowEnds) {
			bucket = rateLimitBucket{windowEnds: now.Add(window)}
		}

		if bucket.count >= maxRequests {
			retryAfter := int(time.Until(bucket.windowEnds).Seconds())
			if retryAfter < 1 {
				retryAfter = 1
			}
			mu.Unlock()

			c.Header("Retry-After", strconv.Itoa(retryAfter))
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Too many authentication attempts. Try again later.",
			})
			return
		}

		bucket.count++
		buckets[key] = bucket

		for ip, existing := range buckets {
			if now.After(existing.windowEnds) {
				delete(buckets, ip)
			}
		}
		mu.Unlock()

		c.Next()
	}
}
