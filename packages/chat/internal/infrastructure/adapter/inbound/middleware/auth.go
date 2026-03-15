package middleware

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type UserInfo struct {
	Sub           string   `json:"sub"`
	Username      string   `json:"username"`
	Phone         *string  `json:"phone"`
	PhoneVerified bool     `json:"phone_verified"`
	Email         *string  `json:"email"`
	EmailVerified bool     `json:"email_verified"`
	Groups        []string `json:"groups"`
	Roles         []string `json:"roles"`
	Permissions   []string `json:"permissions"`
}

// UserInfoAuth reads x-user-info header injected by Traefik after token validation.
// If the header is absent, the request passes through (Traefik allows unauthenticated requests).
// Handlers that require auth should check for "userId" in context.
func UserInfoAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		userInfoHeader := c.GetHeader("x-user-info")
		if userInfoHeader == "" {
			c.Next()
			return
		}

		var userInfo UserInfo
		if err := json.Unmarshal([]byte(userInfoHeader), &userInfo); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid user info header"})
			c.Abort()
			return
		}

		// sub format: "<tenant>:<user-id>"
		userID := userInfo.Sub
		if parts := strings.SplitN(userInfo.Sub, ":", 2); len(parts) == 2 {
			userID = parts[1]
		}

		c.Set("userId", userID)
		c.Set("userInfo", userInfo)
		c.Next()
	}
}