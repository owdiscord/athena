package handlers

import (
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/labstack/echo/v5"
	"github.com/owdiscord/athena/api/internal/permissions"
	"gopkg.in/yaml.v3"
)

func (h *Handler) Available(c *echo.Context) error {
	userID := c.Get("userID").(string)

	guilds, err := h.db.GetGuildsForUser(c.Request().Context(), userID)
	if err != nil {
		c.Logger().Error("couldn't retrieve guilds for user", "sql_error", err.Error(), "userID", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "server error")
	}

	return c.JSON(http.StatusOK, guilds)
}

func (h *Handler) MyPermissions(c *echo.Context) error {
	userID := c.Get("userID").(string)

	perms, err := h.db.GetPermissionsByUserID(c.Request().Context(), userID)
	if err != nil {
		c.Logger().Error("couldn't retrieve permissions for user", "sql_error", err.Error(), "userID", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "server error")
	}

	return c.JSON(http.StatusOK, perms)
}

func (h *Handler) GetGuild(c *echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")

	if !h.hasPermission(c, userID, guildID, permissions.ViewGuild) {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	guild, err := h.db.GetGuild(c.Request().Context(), guildID)
	if err != nil {
		c.Logger().Error("couldn't retrieve guild", "sql_error", err.Error(), "guildID", guildID, "userID", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "server error")
	}

	return c.JSON(http.StatusOK, guild)
}

func (h *Handler) CheckPermission(c *echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")

	var body struct {
		Permission permissions.APIPermission `json:"permission"`
	}
	if err := c.Bind(&body); err != nil {
		c.Logger().Error("couldn't retrieve guild", "binding_error", err.Error(), "guildID", guildID, "userID", userID)
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}

	result := h.hasPermission(c, userID, guildID, body.Permission)
	return c.JSON(http.StatusOK, map[string]bool{"result": result})
}

func (h *Handler) GetConfig(c *echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")

	if !h.hasPermission(c, userID, guildID, permissions.ReadConfig) {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	config, err := h.db.GetActiveConfig(c.Request().Context(), "guild-"+guildID)
	if err != nil {
		c.Logger().Error("couldn't retrieve guild", "sql_error", err.Error(), "guildID", guildID, "userID", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "server error")
	}

	configStr := ""
	if config != nil {
		configStr = config.Config
	}

	return c.JSON(http.StatusOK, map[string]string{"config": configStr})
}

func (h *Handler) SaveConfig(c *echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")

	if !h.hasPermission(c, userID, guildID, permissions.EditConfig) {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	var body struct {
		Config *string `json:"config"`
	}
	if err := c.Bind(&body); err != nil || body.Config == nil {
		c.Logger().Error("couldn't retrieve guild", "binding_error", err.Error(), "guildID", guildID, "userID", userID)
		return echo.NewHTTPError(http.StatusBadRequest, "no config supplied")
	}

	config := strings.TrimSpace(*body.Config) + "\n"

	current, err := h.db.GetActiveConfig(c.Request().Context(), "guild-"+guildID)
	if err == nil && current != nil && config == current.Config {
		return c.NoContent(http.StatusOK)
	}

	if err := validateYAML(config); err != nil {
		return c.JSON(http.StatusBadRequest, map[string][]string{"errors": {err.Error()}})
	}

	tx, err := h.db.Tx()
	if err != nil {
		c.Logger().Error("cannot start transaction to save new config", "tx_err", err)
		return c.JSON(http.StatusInternalServerError, map[string][]string{"errors": {err.Error()}})
	}

	if err := h.db.MarkOldConfigsInactive(tx, c.Request().Context(), "guild-"+guildID); err != nil {
		tx.Rollback()
		c.Logger().Error("couldn't mark old configs inactive", "sql_error", err.Error(), "guildID", guildID, "userID", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "server error")
	}

	if err := h.db.SaveConfigRevision(tx, c.Request().Context(), "guild-"+guildID, config, userID); err != nil {
		tx.Rollback()
		c.Logger().Error("couldn't save new config", "sql_error", err.Error(), "guildID", guildID, "userID", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "server error")
	}

	if err := tx.Commit(); err != nil {
		tx.Rollback()
		c.Logger().Error("couldn't commit config transaction", "tx_err", err.Error(), "guildID", guildID, "userID", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "server error")
	}

	return c.NoContent(http.StatusOK)
}

func (h *Handler) GetPermissions(c *echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")

	if !h.hasPermission(c, userID, guildID, permissions.ManageAccess) {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	perms, err := h.db.GetPermissionsByGuildID(c.Request().Context(), guildID)
	if err != nil {
		c.Logger().Error("couldn't retrieve guild", "sql_error", err.Error(), "guildID", guildID, "userID", userID)
		return echo.NewHTTPError(http.StatusInternalServerError, "server error")
	}

	return c.JSON(http.StatusOK, perms)
}

func (h *Handler) SetTargetPermissions(c *echo.Context) error {
	userID := c.Get("userID").(string)
	guildID := c.Param("guildId")

	if !h.hasPermission(c, userID, guildID, permissions.ManageAccess) {
		return echo.NewHTTPError(http.StatusUnauthorized, "unauthorized")
	}

	var body struct {
		Type        string                      `json:"type"`
		TargetID    string                      `json:"targetId"`
		Permissions []permissions.APIPermission `json:"permissions"`
		ExpiresAt   *time.Time                  `json:"expiresAt"`
	}
	if err := c.Bind(&body); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid body")
	}

	if body.Type != "user" {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid type")
	}
	if !isSnowflake(body.TargetID) {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid targetId")
	}

	validPerms := make(map[permissions.APIPermission]bool)
	for _, p := range permissions.All {
		if p != permissions.Owner {
			validPerms[p] = true
		}
	}
	for _, p := range body.Permissions {
		if !validPerms[p] {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid permissions")
		}
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	existing, _ := h.db.GetPermissionsByGuildAndUserID(c.Request().Context(), guildID, body.TargetID)
	if existing != nil && containsPermission(existing.Permissions, permissions.Owner) {
		return echo.NewHTTPError(http.StatusBadRequest, "can't change owner permissions")
	}

	if len(body.Permissions) == 0 {
		if err := h.db.RemoveUserPermissions(c.Request().Context(), guildID, body.TargetID); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "server error")
		}
		h.db.AddAuditLog(c.Request().Context(), guildID, userID, "REMOVE_API_PERMISSION", map[string]any{
			"type": body.Type, "target_id": body.TargetID,
		})
	} else if existing != nil {
		if err := h.db.UpdateUserPermissions(c.Request().Context(), guildID, body.TargetID, body.Permissions); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "server error")
		}
		h.db.AddAuditLog(c.Request().Context(), guildID, userID, "EDIT_API_PERMISSION", map[string]any{
			"type": body.Type, "target_id": body.TargetID, "permissions": body.Permissions, "expires_at": existing.ExpiresAt,
		})
	} else {
		if err := h.db.AddUserPermissions(c.Request().Context(), guildID, body.TargetID, body.Permissions, body.ExpiresAt); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "server error")
		}
		h.db.AddAuditLog(c.Request().Context(), guildID, userID, "ADD_API_PERMISSION", map[string]any{
			"type": body.Type, "target_id": body.TargetID, "permissions": body.Permissions, "expires_at": body.ExpiresAt,
		})
	}

	return c.NoContent(http.StatusOK)
}

func (h *Handler) hasPermission(c *echo.Context, userID, guildID string, perm permissions.APIPermission) bool {
	assignment, err := h.db.GetPermissionsByGuildAndUserID(c.Request().Context(), guildID, userID)
	if err != nil || assignment == nil {
		return false
	}
	return containsPermission(assignment.Permissions, perm) || containsPermission(assignment.Permissions, permissions.Owner)
}

func containsPermission(perms []permissions.APIPermission, target permissions.APIPermission) bool {
	return slices.Contains(perms, target)
}

func isSnowflake(s string) bool {
	if len(s) < 17 || len(s) > 19 {
		return false
	}
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}

func validateYAML(config string) error {
	var out any
	return yaml.Unmarshal([]byte(config), &out)
}
