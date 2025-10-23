package repository

import (
	"internet_provider/internal/entity"

	"gorm.io/gorm"
)

type PaymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (h *PaymentRepository) ToUpBalance(UserID int, amount float64, paymentMethod string) error {
	return h.db.Transaction(func(tx *gorm.DB) error {
		var user entity.User

		if err := tx.First(&user, UserID).Error; err != nil {
			return err
		}

		newBalance := user.Balance + amount
		if err := tx.Model(&user).Update("balance", newBalance).Error; err != nil {
			return err
		}

		operation := entity.Payment{
			UserID:        user.Id,
			PaymentMethod: paymentMethod,
			Amount:        amount,
			Status:        "completed",
		}

		return tx.Create(&operation).Error
	})
}

func (r *PaymentRepository) GetBalanceHistory(UserID int) ([]entity.Payment, error) {
	var operation []entity.Payment
	err := r.db.Where("user_id = ?", UserID).Order("created_at DESC").Find(&operation).Error

	return operation, err
}
