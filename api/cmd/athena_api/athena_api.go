package main

import (
	"context"
	"log"
	"log/slog"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v5"
	echomiddleware "github.com/labstack/echo/v5/middleware"

	"github.com/owdiscord/athena/api/internal/db"
	"github.com/owdiscord/athena/api/internal/handlers"

	"github.com/owdiscord/athena/api/internal/middleware"
	"github.com/owdiscord/athena/api/internal/services/discord"
)

func main() {
	// Used in development, literally do not care if it hasn't been instantiated.
	godotenv.Load("../.env", ".env")

	if os.Getenv("DATABASE_URL") == "" || os.Getenv("DISCORD_CLIENT_ID") == "" || os.Getenv("DISCORD_CLIENT_SECRET") == "" || os.Getenv("DISCORD_REDIRECT_URI") == "" || os.Getenv("KEY") == "" {
		log.Fatal("environment variables are not set. can't start")
	}

	db, err := db.New(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatal(err)
	}

	discord := &discord.Config{
		ClientID:     os.Getenv("DISCORD_CLIENT_ID"),
		ClientSecret: os.Getenv("DISCORD_CLIENT_SECRET"),
		RedirectURI:  os.Getenv("DISCORD_REDIRECT_URI"),
		Scopes:       []string{"identify"},
	}

	handlers := handlers.New(os.Getenv("KEY"), discord, db)

	app := echo.New()
	app.Use(echomiddleware.RequestLoggerWithConfig(echomiddleware.RequestLoggerConfig{
		LogStatus:   true,
		LogURI:      true,
		HandleError: true, // forwards error to the global error handler, so it can decide appropriate status code
		LogValuesFunc: func(c *echo.Context, v echomiddleware.RequestLoggerValues) error {
			if v.Error == nil {
				slog.LogAttrs(context.Background(), slog.LevelInfo, "REQUEST",
					slog.String("uri", v.URI),
					slog.Int("status", v.Status),
				)
			} else {
				slog.LogAttrs(context.Background(), slog.LevelError, "REQUEST_ERROR",
					slog.String("uri", v.URI),
					slog.Int("status", v.Status),
					slog.String("err", v.Error.Error()),
				)
			}
			return nil
		},
	}))
	app.GET("/api", func(c *echo.Context) error {
		return c.JSON(200, map[string]string{"status": "cookies", "with": "milk"})
	})
	app.GET("/api/auth/login", handlers.OAuthLogin)
	app.GET("/api/auth/oauth-callback", handlers.OAuthCallback)

	// Redirect historic path to new path
	app.GET("/api/spam-logs/:id", func(c *echo.Context) error {
		return c.Redirect(http.StatusPermanentRedirect, "/api/archives/"+c.Param("id"))
	})
	app.GET("/api/archives/:id", handlers.GetArchive)

	g := app.Group("/api")
	g.Use(middleware.APIKeyAuth(db))
	g.POST("/auth/logout", handlers.Logout)
	g.POST("/auth/refresh", handlers.Refresh)
	g.GET("/guilds/available", handlers.Available)
	g.GET("/guilds/my-permissions", handlers.MyPermissions)
	g.GET("/guilds/:guildId", handlers.GetGuild)
	g.POST("/guilds/:guildId/check-permission", handlers.CheckPermission)
	g.GET("/guilds/:guildId/config", handlers.GetConfig)
	g.POST("/guilds/:guildId/config", handlers.SaveConfig)
	g.GET("/guilds/:guildId/permissions", handlers.GetPermissions)
	g.POST("/guilds/:guildId/set-target-permissions", handlers.SetTargetPermissions)

	if err := app.Start("0.0.0.0:8080"); err != nil {
		app.Logger.Error("Failed to start server", "error", err)
	}
}
