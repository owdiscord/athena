package handlers

import (
	"github.com/jmoiron/sqlx"
	"github.com/owdiscord/athena/api/internal/services/discord"
)

type Handler struct {
	discord *discord.Config
	db      *sqlx.DB
}

func New(discord *discord.Config, db *sqlx.DB) Handler {
	return Handler{
		discord,
		db,
	}
}
