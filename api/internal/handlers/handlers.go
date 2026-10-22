// Package handlers contains our HTTP endpoints, split up by their
// generalised purpose. All handlers are functions on the Handler struct
// which gives us easy-access to dependencies.
package handlers

import (
	"sync"

	"github.com/owdiscord/athena/api/internal/db"
	"github.com/owdiscord/athena/api/internal/docs"
	"github.com/owdiscord/athena/api/internal/services/discord"
)

type Handler struct {
	key     string
	discord *discord.Config
	db      *db.DB
	plugins []docs.PluginDoc
	mu      sync.Mutex
}

func New(key string, discord *discord.Config, db *db.DB, docs []docs.PluginDoc) Handler {
	return Handler{
		key,
		discord,
		db,
		docs,
		sync.Mutex{},
	}
}
