package handlers

import (
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
		return c.Redirect(http.StatusTemporaryRedirect, dashboardURL("/login-callback?error=noAccess&msg=noCode"))
	}

	resp, err := h.discord.Exchange(code)
	if err != nil {
		return c.Redirect(http.StatusTemporaryRedirect, dashboardURL("/login-callback?error=noAccess&msg=noExchange"))
	}

	user, err := discord.GetUser(resp.AccessToken)
	if err != nil {
		return c.Redirect(http.StatusTemporaryRedirect, dashboardURL("/login-callback?error=noAccess&msg=noToken"))
	}

	// Check the user has access to at least one guild
	perms, err := h.db.GetPermissionsByUserID(c.Request().Context(), user.ID)
	if err != nil || len(perms) == 0 {
		c.Logger().Error("no_perms", "db_err", err)
		return c.Redirect(http.StatusTemporaryRedirect, dashboardURL("/login-callback?error=noAccess&msg=noPerms"))
	}

	apiKey, err := h.db.CreateAPIKey(c.Request().Context(), user.ID)
	if err != nil {
		c.Logger().Error("no_api_key", "db_err", err)
		return c.Redirect(http.StatusTemporaryRedirect, dashboardURL("/login-callback?error=noAccess&msg=cantMakeKey"))
	}

	if err := h.db.UpsertUserInfo(c.Request().Context(), user.ID, user.Username, user.Avatar); err != nil {
		c.Logger().Error("no_upsert", "db_err", err)
		return c.Redirect(http.StatusTemporaryRedirect, dashboardURL("/login-callback?error=noAccess&msg=cantUpsert"))
	}

	return c.Redirect(http.StatusTemporaryRedirect, dashboardURL("/login-callback?apiKey="+apiKey))
}

func (h *Handler) OAuthValidateKey(c *echo.Context) error {
	var body struct {
		Key string `json:"key"`
	}
	if err := c.Bind(&body); err != nil || body.Key == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "No key supplied"})
	}

	userID, err := h.db.GetUserIDByAPIKey(c.Request().Context(), body.Key)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
	}
	if userID == "" {
		return c.JSON(http.StatusOK, map[string]bool{"valid": false})
	}

	return c.JSON(http.StatusOK, map[string]any{"valid": true, "userId": userID})
}

func (h *Handler) Logout(c *echo.Context) error {
	apiKey := c.Request().Header.Get("X-Api-Key")
	if err := h.db.ExpireAPIKey(c.Request().Context(), apiKey); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "failed to logout")
	}
	return c.NoContent(http.StatusOK)
}

func (h *Handler) Refresh(c *echo.Context) error {
	// The APIKeyAuth middleware already refreshes the expiry on every request,
	// so there's nothing to do here but return 200
	return c.NoContent(http.StatusOK)
}

func dashboardURL(to string) string {
	return to
}
