package middleware

import (
	"internet_provider/internal/service"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

func AdminAuthMiddleware(adminService *service.AdminService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		log.Printf("Auth Header: %s", authHeader) // Добавим логирование
		log.Printf("Request URL: %s %s", c.Request.Method, c.Request.URL.String())

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Правильно извлекаем токен
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			log.Printf("Invalid auth format. Parts: %v", parts)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token required"})
			c.Abort()
			return
		}

		token := parts[1]
		log.Printf("Token extracted: %s...", token[:min(len(token), 10)]) // Логируем начало токена

		// Проверяем токен
		claims, err := adminService.VerifyJWT(token)
		if err != nil {
			log.Printf("Token verification failed: %v", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		log.Printf("Token valid for admin: %s (ID: %v)", claims["username"], claims["admin_id"])

		// Сохраняем данные администратора в контекст
		c.Set("admin_id", claims["admin_id"])
		c.Set("admin_username", claims["username"])
		c.Set("admin_role", claims["role"])

		c.Next()
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
