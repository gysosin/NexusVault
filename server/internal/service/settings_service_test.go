package service

import (
	"regexp"
	"testing"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"
)

func TestUpdateSystemSettings_Optimized(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("an error '%s' was not expected when opening a stub database connection", err)
	}
	defer db.Close()
	sqlxDB := sqlx.NewDb(db, "sqlmock")

	// Create a transaction
	mock.ExpectBegin()
	tx, err := sqlxDB.Beginx()
	if err != nil {
		t.Fatalf("failed to begin transaction: %v", err)
	}

	// 3 settings -> Expect 1 INSERT statement (batched)
	req := map[string]interface{}{
		"k1": "v1",
		"k2": "v2",
		"k3": "v3",
	}

	stmt := regexp.QuoteMeta(`INSERT INTO system_settings (key, value, updated_at)`)

	// Expect 1 Exec call with 2 arguments (the arrays)
	mock.ExpectExec(stmt).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 3))

	err = UpdateSystemSettings(tx, req)
	if err != nil {
		t.Errorf("UpdateSystemSettings failed: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("there were unfulfilled expectations: %s", err)
	}
}
