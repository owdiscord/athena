package main

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/labstack/echo/v5"
	"github.com/owdiscord/athena/api/internal/handlers"
	"github.com/owdiscord/athena/api/internal/services/db"
	"github.com/owdiscord/athena/api/internal/services/discord"
)

func main() {
	// Used in development, literally do not care if it hasn't been instantiated.
	godotenv.Load("../.env", ".env")

	if os.Getenv("DATABASE_URL") == "" {
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

	handlers := handlers.New(discord, db)

	app := echo.New()
	app.GET("/", func(c *echo.Context) error {
		return c.JSON(200, map[string]string{"status": "cookies", "with": "milk"})
	})
	app.GET("/api/auth/login", handlers.OAuthLogin)
	app.GET("/api/auth/oauth-callback", handlers.OAuthCallback)

	if err := app.Start(":8080"); err != nil {
		app.Logger.Error("Failed to start server", "error", err)
	}
}
