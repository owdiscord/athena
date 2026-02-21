// Package models contains, as the name suggests, models of the database entities
// we want to work with. They are incomplete and not fully-fledged representations
// of the database, but they include what we need.
package models

import (
	"time"

	"github.com/owdiscord/athena/api/internal/permissions"
)

type APILogin struct {
	ID         string     `db:"id" json:"id"`
	Token      string     `db:"token" json:"token"`
	UserID     string     `db:"user_id" json:"user_id"`
	LoggedInAt *time.Time `db:"logged_in_at" json:"logged_in_at"`
	ExpiresAt  *time.Time `db:"expires_at" json:"expires_at"`
}

type Guild struct {
	ID        string     `db:"id" json:"id"`
	Name      string     `db:"name" json:"name"`
	Icon      *string    `db:"icon" json:"icon"`
	OwnerID   string     `db:"owner_id" json:"owner_id"`
	UpdatedAt *time.Time `db:"updated_at" json:"updated_at"`
}

type PermissionAssignment struct {
	GuildID     string                      `db:"guild_id" json:"guild_id"`
	Type        string                      `db:"type" json:"type"`
	TargetID    string                      `db:"target_id" json:"target_id"`
	Permissions []permissions.APIPermission `db:"permissions" json:"permissions"`
	ExpiresAt   *time.Time                  `db:"expires_at" json:"expires_at"`
}

type Config struct {
	Key      string    `db:"key" json:"key"`
	Config   string    `db:"config" json:"config"`
	EditedBy string    `db:"edited_by" json:"edited_by"`
	EditedAt time.Time `db:"edited_at" json:"edited_at"`
}

type AuditLog struct {
	ID        int64     `db:"id" json:"id"`
	GuildID   string    `db:"guild_id" json:"guild_id"`
	UserID    string    `db:"user_id" json:"user_id"`
	EventType string    `db:"event_type" json:"event_type"`
	Data      string    `db:"data" json:"data"` // stored as JSON
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

type Archive struct {
	ID        string     `db:"id" json:"id"`
	Body      string     `db:"body" json:"body"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	ExpiresAt *time.Time `db:"expires_at" json:"expires_at"`
}
