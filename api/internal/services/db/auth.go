package db

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type APILogin struct {
	ID         string
	Token      string
	UserID     string
	LoggedInAt string
	ExpiresAt  string
}

func CreateAPIKey(db *sqlx.DB, ctx context.Context, userID string) (string, error) {
	// Generate unique loginID (UUIDv7)
	loginUUID, err := uuid.NewV7()
	if err != nil {
		return "", fmt.Errorf("failed to generate login id: %w", err)
	}

	loginID := loginUUID.String()

	// Generate token
	tokenBytes := make([]byte, 16)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	token := hex.EncodeToString(tokenBytes)

	// Hash the token using loginID as salt
	hash := sha256.New()
	hash.Write([]byte(loginID + token))
	hashedToken := hex.EncodeToString(hash.Sum(nil))

	_, err = db.ExecContext(ctx,
		"INSERT INTO api_logins (id, token, user_id, logged_in_at, expires_at) VALUES (?, ?, ?, now(), DATE_ADD(now(), INTERVAL 24 HOUR))",
		loginID, hashedToken, userID,
	)
	if err != nil {
		return "", fmt.Errorf("failed to save api key: %w", err)
	}

	return loginID + "." + token, nil
}

func GetUserIDByAPIKey(db sqlx.DB, ctx context.Context, apiKey string) (string, error) {
	loginID, token, err := extractToken(apiKey)
	if err != nil {
		return "", err
	}
	var login APILogin

	if err := db.GetContext(ctx, &login, "SELECT * FROM api_logins WHERE id = ? AND expires_at > now() LIMIT 1", loginID); err != nil {
		return "", err
	}

	hash := sha256.New()
	hash.Write([]byte(loginID + token))
	hashedToken := hex.EncodeToString(hash.Sum(nil))

	if hashedToken != login.Token {
		return "", errors.New("tokens do not match")
	}

	return login.UserID, nil
}

func ExpireAPIKey(db *sqlx.DB, ctx context.Context, apiKey string) error {
	loginID, _, err := extractToken(apiKey)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, "UPDATE api_logins SET expires_at = now() WHERE id = ?", loginID)
	return err
}

func RefreshAPIKeyExpiry(db *sqlx.DB, ctx context.Context, apiKey string) error {
	loginID, _, err := extractToken(apiKey)
	if err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, "UPDATE api_logins SET expires_at = DATE_ADD(now(), INTERVAL 24 HOUR) WHERE id = ?", loginID)
	return err
}

func extractToken(input string) (string, string, error) {
	split := strings.Split(input, ".")
	if len(split) < 2 {
		return "", "", errors.New("the given api key was malformed")
	}

	return split[0], split[1], nil
}

// func UserHasGuildAccess(db *sqlx.DB, ctx context.Context, userID string) (bool, error)
// func UpsertUser(db *sqlx.DB, ctx context.Context, user *discord.User) error
