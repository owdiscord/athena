// Package models contains, as the name suggests, models of the database entities
// we want to work with. They are incomplete and not fully-fledged representations
// of the database, but they include what we need.
package models

import (
	"time"

	"github.com/owdiscord/athena/api/internal/permissions"
)

type APILogin struct {
	ID         string     `db:"id"`
	Token      string     `db:"token"`
	UserID     string     `db:"user_id"`
	LoggedInAt *time.Time `db:"logged_in_at"`
	ExpiresAt  *time.Time `db:"expires_at"`
}

type Guild struct {
	ID        string     `db:"id"`
	Name      string     `db:"name"`
	Icon      *string    `db:"icon"`
	OwnerID   string     `db:"owner_id"`
	UpdatedAt *time.Time `db:"updated_at"`
}

type PermissionAssignment struct {
	GuildID     string                      `db:"guild_id"`
	Type        string                      `db:"type"`
	TargetID    string                      `db:"target_id"`
	Permissions []permissions.APIPermission `db:"permissions"`
	ExpiresAt   *time.Time                  `db:"expires_at"`
}

type Config struct {
	Key       string    `db:"key"`
	Config    string    `db:"config"`
	UserID    string    `db:"user_id"`
	CreatedAt time.Time `db:"created_at"`
}

type AuditLog struct {
	ID        int64     `db:"id"`
	GuildID   string    `db:"guild_id"`
	UserID    string    `db:"user_id"`
	EventType string    `db:"event_type"`
	Data      string    `db:"data"` // stored as JSON
	CreatedAt time.Time `db:"created_at"`
}

type Archive struct {
	ID        string     `db:"id"`
	Body      string     `db:"body"`
	CreatedAt time.Time  `db:"created_at"`
	ExpiresAt *time.Time `db:"expires_at"`
}
