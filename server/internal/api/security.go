package api

import (
	"context"
	"net/http"
	"time"

	"go-server/internal/db"

	"github.com/gin-gonic/gin"
)

const failedLoginTrendDays = 7

type failedLoginTrendRow struct {
	Day   time.Time `db:"day"`
	Count int       `db:"count"`
}

type FailedLoginTrendPoint struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

func GetFailedLoginTrend(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), authDatabaseTimeout)
	defer cancel()

	var rows []failedLoginTrendRow
	query := `
		SELECT DATE_TRUNC('day', created_at)::date AS day, COUNT(*) AS count
		FROM activity_logs
		WHERE action = 'Login'
			AND status = 'Failed'
			AND created_at >= NOW() - (($1 - 1) * INTERVAL '1 day')
		GROUP BY day
		ORDER BY day ASC
	`
	if err := db.DB.SelectContext(ctx, &rows, query, failedLoginTrendDays); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch failed login trend"})
		return
	}

	c.JSON(http.StatusOK, buildFailedLoginTrend(rows, time.Now().UTC(), failedLoginTrendDays))
}

func buildFailedLoginTrend(rows []failedLoginTrendRow, today time.Time, days int) []FailedLoginTrendPoint {
	countsByDate := make(map[string]int, len(rows))
	for _, row := range rows {
		countsByDate[row.Day.Format("2006-01-02")] = row.Count
	}

	points := make([]FailedLoginTrendPoint, 0, days)
	start := midnightUTC(today).AddDate(0, 0, -(days - 1))
	for index := 0; index < days; index++ {
		day := start.AddDate(0, 0, index)
		date := day.Format("2006-01-02")
		points = append(points, FailedLoginTrendPoint{
			Date:  date,
			Count: countsByDate[date],
		})
	}
	return points
}

func midnightUTC(value time.Time) time.Time {
	utc := value.UTC()
	return time.Date(utc.Year(), utc.Month(), utc.Day(), 0, 0, 0, 0, time.UTC)
}
