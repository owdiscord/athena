package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/owdiscord/athena/api/internal/models"
	"github.com/owdiscord/athena/api/internal/permissions"
)

func (db *DB) GetGuildsForUser(ctx context.Context, userID string) ([]models.Guild, error) {
	var guilds []models.Guild
	err := db.conn.SelectContext(ctx, &guilds, `
		SELECT ag.id, ag.name, ag.icon, ag.owner_id, ag.updated_at
		FROM allowed_guilds ag
		INNER JOIN api_permissions ap
			ON ap.guild_id = ag.id
			AND ap.type = 'USER'
			AND ap.target_id = ?
	`, userID)
	return guilds, err
}

func (db *DB) GetGuild(ctx context.Context, guildID string) (*models.Guild, error) {
	var guild models.Guild
	err := db.conn.GetContext(ctx, &guild, `
		SELECT id, name, icon, owner_id, updated_at FROM allowed_guilds WHERE id = ?
	`, guildID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &guild, err
}

func (db *DB) IsGuildAllowed(ctx context.Context, guildID string) (bool, error) {
	var count int
	err := db.conn.GetContext(ctx, &count, `
		SELECT COUNT(*) FROM allowed_guilds WHERE id = ?
	`, guildID)
	return count > 0, err
}

type rawPermissions struct {
	GuildID     string     `db:"guild_id"`
	Type        string     `db:"type"`
	TargetID    string     `db:"target_id"`
	Permissions string     `db:"permissions"` // JSON array
	ExpiresAt   *time.Time `db:"expires_at"`
}

func (db *DB) GetPermissionsByUserID(ctx context.Context, userID string) ([]models.PermissionAssignment, error) {
	var rows []rawPermissions
	err := db.conn.SelectContext(ctx, &rows, `
		SELECT guild_id, "type", target_id, permissions, expires_at FROM api_permissions WHERE type = 'USER' AND target_id = ?
	`, userID)
	if err != nil {
		return nil, err
	}
	return scanPermissions(rows)
}

func (db *DB) GetPermissionsByGuildID(ctx context.Context, guildID string) ([]models.PermissionAssignment, error) {
	var rows []rawPermissions
	err := db.conn.SelectContext(ctx, &rows, `
		SELECT guild_id, "type", target_id, permissions, expires_at FROM api_permissions WHERE guild_id = ?
	`, guildID)
	if err != nil {
		return nil, err
	}
	return scanPermissions(rows)
}

func (db *DB) GetPermissionsByGuildAndUserID(ctx context.Context, guildID, userID string) (*models.PermissionAssignment, error) {
	var row struct {
		GuildID     string     `db:"guild_id"`
		Type        string     `db:"type"`
		TargetID    string     `db:"target_id"`
		Permissions string     `db:"permissions"`
		ExpiresAt   *time.Time `db:"expires_at"`
	}
	err := db.conn.GetContext(ctx, &row, `
		SELECT guild_id, "type", target_id, permissions, expires_at FROM api_permissions
		WHERE guild_id = ? AND type = 'USER' AND target_id = ?
	`, guildID, userID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	perms, err := parsePermissions(row.Permissions)
	if err != nil {
		return nil, err
	}

	return &models.PermissionAssignment{
		GuildID:     row.GuildID,
		Type:        row.Type,
		TargetID:    row.TargetID,
		Permissions: perms,
		ExpiresAt:   row.ExpiresAt,
	}, nil
}

func (db *DB) AddUserPermissions(ctx context.Context, guildID, userID string, perms []permissions.APIPermission, expiresAt *time.Time) error {
	permsJSON, err := json.Marshal(perms)
	if err != nil {
		return err
	}
	_, err = db.conn.ExecContext(ctx, `
		INSERT INTO api_permissions (guild_id, type, target_id, permissions, expires_at)
		VALUES (?, 'USER', ?, ?, ?)
	`, guildID, userID, string(permsJSON), expiresAt)
	return err
}

func (db *DB) UpdateUserPermissions(ctx context.Context, guildID, userID string, perms []permissions.APIPermission) error {
	permsJSON, err := json.Marshal(perms)
	if err != nil {
		return err
	}
	_, err = db.conn.ExecContext(ctx, `
		UPDATE api_permissions SET permissions = ?
		WHERE guild_id = ? AND type = 'USER' AND target_id = ?
	`, string(permsJSON), guildID, userID)
	return err
}

func (db *DB) RemoveUserPermissions(ctx context.Context, guildID, userID string) error {
	_, err := db.conn.ExecContext(ctx, `
		DELETE FROM api_permissions
		WHERE guild_id = ? AND type = 'USER' AND target_id = ?
	`, guildID, userID)
	return err
}

func (db *DB) ClearExpiredPermissions(ctx context.Context) error {
	_, err := db.conn.ExecContext(ctx, `
		DELETE FROM api_permissions
		WHERE expires_at IS NOT NULL AND expires_at <= NOW()
	`)
	return err
}

func (db *DB) GetActiveConfig(ctx context.Context, key string) (*models.Config, error) {
	var config models.Config
	err := db.conn.GetContext(ctx, &config, "SELECT `key`, config, user_id, created_at FROM configs WHERE `key` = ? ORDER BY created_at DESC LIMIT 1", key)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return &config, err
}

func (db *DB) SaveConfigRevision(ctx context.Context, key, config, userID string) error {
	_, err := db.conn.ExecContext(ctx, "INSERT INTO configs (`key`, config, user_id, created_at) VALUES (?, ?, ?, NOW())", key, config, userID)
	return err
}

func (db *DB) AddAuditLog(ctx context.Context, guildID, userID, eventType string, data map[string]any) error {
	dataJSON, err := json.Marshal(data)
	if err != nil {
		return err
	}
	_, err = db.conn.ExecContext(ctx, `
		INSERT INTO audit_logs (guild_id, user_id, event_type, data, created_at)
		VALUES (?, ?, ?, ?, NOW())
	`, guildID, userID, eventType, string(dataJSON))
	return err
}

// --- helpers ---

// scanPermissions handles deserializing the JSON permissions column
func scanPermissions(rows []rawPermissions) ([]models.PermissionAssignment, error) {
	result := make([]models.PermissionAssignment, 0, len(rows))
	for _, row := range rows {
		perms, err := parsePermissions(row.Permissions)
		if err != nil {
			return nil, err
		}

		result = append(result, models.PermissionAssignment{
			GuildID:     row.GuildID,
			Type:        row.Type,
			TargetID:    row.TargetID,
			Permissions: perms,
			ExpiresAt:   row.ExpiresAt,
		})
	}
	return result, nil
}

func parsePermissions(raw string) ([]permissions.APIPermission, error) {
	// Try JSON array first
	var perms []permissions.APIPermission
	if err := json.Unmarshal([]byte(raw), &perms); err == nil {
		return perms, nil
	}
	// Fall back to plain string
	return []permissions.APIPermission{permissions.APIPermission(raw)}, nil
}
