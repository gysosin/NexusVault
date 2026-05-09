package api

import (
	"testing"
	"time"
)

func TestBuildFailedLoginTrendFillsMissingDays(t *testing.T) {
	today := time.Date(2026, 5, 9, 12, 0, 0, 0, time.UTC)
	rows := []failedLoginTrendRow{
		{Day: time.Date(2026, 5, 8, 0, 0, 0, 0, time.UTC), Count: 3},
	}

	trend := buildFailedLoginTrend(rows, today, 3)
	if len(trend) != 3 {
		t.Fatalf("len(trend) = %d, want 3", len(trend))
	}
	if trend[0].Date != "2026-05-07" || trend[0].Count != 0 {
		t.Fatalf("trend[0] = %+v, want 2026-05-07 count 0", trend[0])
	}
	if trend[1].Date != "2026-05-08" || trend[1].Count != 3 {
		t.Fatalf("trend[1] = %+v, want 2026-05-08 count 3", trend[1])
	}
	if trend[2].Date != "2026-05-09" || trend[2].Count != 0 {
		t.Fatalf("trend[2] = %+v, want 2026-05-09 count 0", trend[2])
	}
}
