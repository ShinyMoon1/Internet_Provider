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

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сервера"})
		return
	}

	user := &entity.User{
		Name:         req.Name,
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: string(hashedPassword),
		Balance:      0.00,
		TariffID:     nil,
	}

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

func (h *AuthHandler) ActivateTarrif(c *gin.Context) {
	var request struct {
		UserID   int `json:"user_id" binding:"required"`
		TariffID int `json:"tariff_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный формат данных" + err.Error()})
		return
	}

	err := h.userRepo.SetTariff(request.UserID, request.UserID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка при обновлении тарифа"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Траиф успешно активирован",
		"tariff_id": request.TariffID,
	})
}

func (h *AuthHandler) GetUserProfile(c *gin.Context) {
	userID := c.Param("id")
	log.Printf("GetUserProfile: ищем пользователя с ID=%s", userID)

	var user entity.User

	err := h.userRepo.LoadTariff(&user, userID)

	if err != nil {
		log.Printf("❌ Пользователь с ID=%s не найден: %v", userID, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный фрмат данных" + err.Error()})
		return
	}

	log.Printf("✅ Найден пользователь: %+v", user)
	c.JSON(http.StatusOK, gin.H{
		"user": user,
	})
}
