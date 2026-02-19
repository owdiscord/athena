package middleware

import (
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/owdiscord/athena/api/internal/db"
)

func APIKeyAuth(db *db.DB) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c *echo.Context) error {
			apiKey := c.Request().Header.Get("X-Api-Key")
			if apiKey == "" {
				return echo.NewHTTPError(http.StatusUnauthorized, "API key missing")
			}

			userID, err := db.GetUserIDByAPIKey(c.Request().Context(), apiKey)
			if err != nil {
				return echo.NewHTTPError(http.StatusUnauthorized, "invalid API key")
			}

			go db.RefreshAPIKeyExpiry(c.Request().Context(), apiKey)

			c.Set("userID", userID)
			return next(c)
		}
	}
}
