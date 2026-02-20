package db

import (
	"context"
	"database/sql"
	"errors"

	"github.com/owdiscord/athena/api/internal/models"
)

func (db *DB) GetArchive(ctx context.Context, id string) (*models.Archive, error) {
	var archive models.Archive
	err := db.conn.GetContext(ctx, &archive, `
		SELECT id, body, created_at, expires_at FROM archives WHERE id = ?
	`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &archive, err
}
