package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"auth/pkg/jwt"
)

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	jwtHelper := jwt.NewHelper(jwtSecret)

	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		// Remove "Bearer " prefix
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			c.Abort()
			return
		}

		claims, err := jwtHelper.VerifyToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		// Set claims in context
		c.Set("userId", claims.UserID)
		c.Set("provider", claims.Provider)
		c.Set("providerId", claims.ProviderID)

		c.Next()
	}
}

func InternalAPIMiddleware(apiKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := c.GetHeader("X-Internal-API-Key")
		if key == "" || key != apiKey {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}
		c.Next()
	}
}
