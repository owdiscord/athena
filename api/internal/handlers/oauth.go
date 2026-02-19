package handlers

import (
	"fmt"
	"net/http"

	"github.com/labstack/echo/v5"
	"github.com/owdiscord/athena/api/internal/services/discord"
)

func (h *Handler) OAuthLogin(c *echo.Context) error {
	return c.Redirect(http.StatusTemporaryRedirect, h.discord.AuthURL(""))
}

func (h *Handler) OAuthCallback(c *echo.Context) error {
	code := c.QueryParam("code")
	if code == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "no code provided",
		})
	}

	resp, err := h.discord.Exchange(code)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	user, err := discord.GetUser(resp.AccessToken)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": err.Error(),
		})
	}

	return c.String(200, fmt.Sprintf("%+v", user))
}
