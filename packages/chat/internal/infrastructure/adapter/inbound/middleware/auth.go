package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func JWTAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Authorization 헤더에서 토큰 가져오기
		tokenString := ""
		authHeader := c.GetHeader("Authorization")

		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		// 2. 헤더에 없으면 Query Parameter에서 가져오기 (WebSocket용)
		if tokenString == "" {
			tokenString = c.Query("token")
		}

		// 3. 토큰이 없으면 에러
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization required"})
			c.Abort()
			return
		}

		// 토큰 검증
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			// userId 저장 (테스트 토큰은 "userId" 사용)
			if userId, exists := claims["userId"]; exists {
				c.Set("userId", userId)
			} else if sub, exists := claims["sub"]; exists {
				// 기존 토큰 호환성 (sub 필드)
				c.Set("userId", sub)
			}
			c.Set("claims", claims)
		}

		c.Next()
	}
}
