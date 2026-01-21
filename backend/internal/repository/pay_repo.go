package repository

import (
	"internet_provider/internal/entity"
	"strconv"

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

// В файле repository/payment_repository.go добавьте:
func (r *PaymentRepository) GetAllPayments(search string, filter string, page, limit int) ([]entity.Payment, int64, error) {
	var payments []entity.Payment
	var total int64

	query := r.db.Model(&entity.Payment{})

	// Поиск по ID пользователя
	if search != "" {
		if userID, err := strconv.Atoi(search); err == nil {
			query = query.Where("user_id = ?", userID)
		}
	}

	// Фильтр по статусу
	if filter != "" && filter != "all" {
		query = query.Where("status = ?", filter)
	}

	// Считаем общее количество
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Пагинация
	offset := (page - 1) * limit
	err := query.
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&payments).Error

	return payments, total, err
}
