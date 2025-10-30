package middleware

import (
	"internet_provider/internal/service"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AdminAuthMiddleware(adminService *service.AdminService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Извлекаем токен
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if token == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token required"})
			c.Abort()
			return
		}

		// Проверяем токен
		claims, err := adminService.VerifyJWT(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Сохраняем данные администратора в контекст
		c.Set("admin_id", claims["admin_id"])
		c.Set("admin_username", claims["username"])
		c.Set("admin_role", claims["role"])

		c.Next()
	}
}
