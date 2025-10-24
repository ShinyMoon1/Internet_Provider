package handler

import (
	"internet_provider/internal/repository"
	"log"
	"net/http"
	"strconv"

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
