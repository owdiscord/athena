package discord

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

const (
	authURL  = "https://discord.com/api/oauth2/authorize"
	tokenURL = "https://discord.com/api/oauth2/token"
	userURL  = "https://discord.com/api/users/@me"
)

type Config struct {
	ClientID     string
	ClientSecret string
	RedirectURI  string
	Scopes       []string
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	RefreshToken string `json:"refresh_token"`
	Scope        string `json:"scope"`
}

type User struct {
	ID       string `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Avatar   string `json:"avatar"`
}

// AuthURL returns the URL to redirect the user to for authorization
func (c *Config) AuthURL(state string) string {
	params := url.Values{
		"client_id":     {c.ClientID},
		"redirect_uri":  {c.RedirectURI},
		"response_type": {"code"},
		"scope":         {strings.Join(c.Scopes, " ")},
		"state":         {state},
	}
	return authURL + "?" + params.Encode()
}

// Exchange swaps an authorization code for an access token
func (c *Config) Exchange(code string) (*TokenResponse, error) {
	params := url.Values{
		"client_id":     {c.ClientID},
		"client_secret": {c.ClientSecret},
		"redirect_uri":  {c.RedirectURI},
		"grant_type":    {"authorization_code"},
		"code":          {code},
	}

	resp, err := http.PostForm(tokenURL, params)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discord returned status %d", resp.StatusCode)
	}

	var token TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return nil, fmt.Errorf("failed to decode token: %w", err)
	}

	return &token, nil
}

// GetUser fetches the authenticated user's profile
func GetUser(accessToken string) (*User, error) {
	req, err := http.NewRequest("GET", userURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("discord returned status %d", resp.StatusCode)
	}

	var user User
	if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {
		return nil, fmt.Errorf("failed to decode user: %w", err)
	}

	return &user, nil
}
