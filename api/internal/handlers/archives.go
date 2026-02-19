package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/labstack/echo/v5"
)

func (h *Handler) GetArchive(c *echo.Context) error {
	archive, err := h.db.GetArchive(c.Request().Context(), c.Param("id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "server error")
	}
	if archive == nil {
		return echo.NewHTTPError(http.StatusNotFound, "not found")
	}

	body := archive.Body

	if !strings.Contains(body, "Log file generated on") {
		body += fmt.Sprintf("\n\nLog file generated on %s", archive.CreatedAt.UTC().Format("2006-01-02 at 15:04:05 (+00:00)"))
		if archive.ExpiresAt != nil {
			body += fmt.Sprintf("\nExpires at %s", archive.ExpiresAt.UTC().Format("2006-01-02 at 15:04:05 (+00:00)"))
		}
	}

	c.Response().Header().Set("Content-Type", "text/plain; charset=UTF-8")
	c.Response().Header().Set("X-Content-Type-Options", "nosniff")
	return c.String(http.StatusOK, body)
}
