package model

import "time"

// SocialProvider represents social login provider types
type SocialProvider int

const (
	ProviderGoogle SocialProvider = 1
	ProviderKakao  SocialProvider = 2
	ProviderNaver  SocialProvider = 3
)

func (p SocialProvider) String() string {
	switch p {
	case ProviderGoogle:
		return "google"
	case ProviderKakao:
		return "kakao"
	case ProviderNaver:
		return "naver"
	default:
		return "unknown"
	}
}

func ParseProvider(s string) SocialProvider {
	switch s {
	case "google":
		return ProviderGoogle
	case "kakao":
		return ProviderKakao
	case "naver":
		return ProviderNaver
	default:
		return 0
	}
}

// AuthProvider represents the social login provider information
type AuthProvider struct {
	Provider   SocialProvider `json:"provider"`
	ProviderID string         `json:"providerId"`
	UserID     *string        `json:"userId,omitempty"`
	CreatedAt  time.Time      `json:"createdAt"`
	UpdatedAt  time.Time      `json:"updatedAt"`
}

// TokenPair represents access and refresh tokens
type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
}

// TokenClaims represents JWT token claims
type TokenClaims struct {
	UserID     string         `json:"userId,omitempty"`
	Provider   SocialProvider `json:"provider"`
	ProviderID string         `json:"providerId"`
	Type       string         `json:"type"` // "access" or "refresh"
}

// SocialLoginRequest represents the request body for social login
type SocialLoginRequest struct {
	Code         string `json:"code" binding:"required"`
	RedirectURI  string `json:"redirectUri" binding:"required"`
	CodeVerifier string `json:"codeVerifier,omitempty"` // For PKCE
}

// SocialLoginNativeRequest represents the request body for native social login
type SocialLoginNativeRequest struct {
	AccessToken string `json:"accessToken" binding:"required"`
}

// RefreshTokenRequest represents the request body for token refresh
type RefreshTokenRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

// SetUserMappingRequest represents the request body for setting user mapping
type SetUserMappingRequest struct {
	ProviderType int    `json:"providerType" binding:"required"`
	ProviderID   string `json:"providerId" binding:"required"`
}

// SocialUserInfo represents user information from social providers
type SocialUserInfo struct {
	ProviderID string `json:"providerId"`
	Email      string `json:"email,omitempty"`
	Name       string `json:"name,omitempty"`
	Picture    string `json:"picture,omitempty"`
}
