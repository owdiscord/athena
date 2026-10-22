package handlers

import (
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/owdiscord/athena/api/internal/docs"
)

func (h *Handler) AllPlugins(c *echo.Context) error {
	return c.JSON(http.StatusOK, h.plugins)
}

func (h *Handler) PluginByName(c *echo.Context) error {
	if plugin := docs.ByName(h.plugins, c.Param("name")); plugin != nil {
		return c.JSON(http.StatusOK, plugin)
	}

	return c.JSON(http.StatusNotFound, map[string]string{
		"error": "no plugin matches the given name",
	})
}
