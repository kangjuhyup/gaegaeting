package middleware

import (
	"encoding/json"
	"net/http"
	"net/url"
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
// For local testing (WebSocket), x-user-info can also be passed as a query parameter.
func UserInfoAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		userInfoHeader := c.GetHeader("x-user-info")
		if userInfoHeader == "" {
			userInfoHeader = c.Query("x-user-info")
		}
		if userInfoHeader == "" {
			c.Next()
			return
		}

		// URL 디코딩 (클라이언트에서 encodeURIComponent로 인코딩한 경우)
		if decoded, err := url.QueryUnescape(userInfoHeader); err == nil {
			userInfoHeader = decoded
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