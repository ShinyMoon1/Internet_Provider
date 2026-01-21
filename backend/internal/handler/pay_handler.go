package handler

import (
	"fmt"
	"internet_provider/internal/repository"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

type PaymentHandler struct {
	PaymentRepo *repository.PaymentRepository
}

func NewPaymentHandler(paymentRepo *repository.PaymentRepository) *PaymentHandler {
	return &PaymentHandler{
		PaymentRepo: paymentRepo,
	}
}

func (h *PaymentHandler) ToUpBalance(c *gin.Context) {
	userID := c.Param("id")

	var request struct {
		Amount        float64 `json:"amount" binding:"required,min=100"`
		PaymentMethod string  `json:"payment_method" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные: " + err.Error()})
		return
	}

	id, err := strconv.Atoi(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID пользователя"})
		return
	}

	err = h.PaymentRepo.ToUpBalance(id, request.Amount, request.PaymentMethod)
	if err != nil {
		log.Print("Ошибка поплнения")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сервера"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Оплата прошла успешно",
		"user_id": userID,
		"amount":  request.Amount,
	})
}

// / В файле handler/payment_handler.go добавьте:
func (h *PaymentHandler) GetPayments(c *gin.Context) {
	// Получаем параметры запроса
	search := c.Query("search")
	filter := c.Query("filter")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	payments, total, err := h.PaymentRepo.GetAllPayments(search, filter, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения платежей"})
		return
	}

	// Можно добавить информацию о пользователях
	type PaymentResponse struct {
		ID            int       `json:"id"`
		UserID        int       `json:"user_id"`
		UserName      string    `json:"user_name"`
		Amount        float64   `json:"amount"`
		Status        string    `json:"status"`
		PaymentMethod string    `json:"payment_method"`
		CreatedAt     time.Time `json:"created_at"`
	}

	var response []PaymentResponse
	for _, payment := range payments {
		// Здесь можно получить имя пользователя, если нужно
		response = append(response, PaymentResponse{
			ID:            payment.ID,
			UserID:        payment.UserID,
			UserName:      fmt.Sprintf("Пользователь #%d", payment.UserID), // Можно добавить реальное имя
			Amount:        payment.Amount,
			Status:        payment.Status,
			PaymentMethod: payment.PaymentMethod,
			CreatedAt:     payment.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"payments": response,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}
