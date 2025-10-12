package jwt

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"auth/internal/model"
)

type Helper struct {
	secret []byte
}

func NewHelper(secret string) *Helper {
	return &Helper{secret: []byte(secret)}
}

type Claims struct {
	UserID     string `json:"userId,omitempty"`
	Provider   int    `json:"provider"`
	ProviderID string `json:"providerId"`
	Type       string `json:"type"`
	jwt.RegisteredClaims
}

func (h *Helper) GenerateToken(claims *model.TokenClaims, tokenType string, duration time.Duration) (string, error) {
	now := time.Now()
	jwtClaims := Claims{
		UserID:     claims.UserID,
		Provider:   int(claims.Provider),
		ProviderID: claims.ProviderID,
		Type:       tokenType,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(now.Add(duration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwtClaims)
	return token.SignedString(h.secret)
}

func (h *Helper) VerifyToken(tokenString string) (*model.TokenClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return h.secret, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return &model.TokenClaims{
			UserID:     claims.UserID,
			Provider:   model.SocialProvider(claims.Provider),
			ProviderID: claims.ProviderID,
			Type:       claims.Type,
		}, nil
	}

	return nil, fmt.Errorf("invalid token")
}
