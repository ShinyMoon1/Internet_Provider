package handler

import (
	"log"
	"net/http"

	"internet_provider/internal/entity"
	"internet_provider/internal/repository"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo *repository.UserRepository
}

func NewAuthHandler(userRepo *repository.UserRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req entity.RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Проверяем существование пользователя
	exists, err := h.userRepo.ExistsByEmail(req.Email)
	if err != nil {
		log.Printf("Ошибка проверки email: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сервера"})
		return
	}
	if exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Пользователь с таким email уже существует"})
		return
	}

	// Хешируем пароль
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сервера"})
		return
	}

	// Создаем пользователя
	user := &entity.User{
		Name:         req.Name,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: string(hashedPassword),
		Balance:      0.00,
		TarrifId:     1,
	}

	// Сохраняем через репозиторий
	if err := h.userRepo.Create(user); err != nil {
		log.Printf("Ошибка регистрации: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка регистрации"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Регистрация успешна",
		"user_id": user.Id,
		"user": gin.H{
			"id":             user.Id,
			"name":           user.Name,
			"email":          user.Email,
			"account_number": user.AccountNumber,
			"balance":        user.Balance,
		},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req entity.LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Ищем пользователя
	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный email или пароль"})
		return
	}

	// Проверяем пароль
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Неверный email или пароль"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Вход успешен",
		"user": gin.H{
			"id":             user.Id,
			"name":           user.Name,
			"email":          user.Email,
			"account_number": user.AccountNumber,
			"balance":        user.Balance,
		},
	})
}
