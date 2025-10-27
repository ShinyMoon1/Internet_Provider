package repository

import (
	"errors"
	"fmt"
	"internet_provider/internal/entity"
	"log"
	"math/rand"
	"time"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *entity.User) error {
	user.AccountNumber = generateAccountNumber()
	return r.db.Create(user).Error
}

func (r *UserRepository) FindByEmail(email string) (*entity.User, error) {
	var user entity.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) ExistsByEmail(email string) (bool, error) {
	var count int64
	err := r.db.Model(&entity.User{}).Where("email = ?", email).Count(&count).Error
	return count > 0, err
}

func (r *UserRepository) GetUserByID(UserID int64) (*entity.User, error) {
	var user entity.User

	result := r.db.Where("id = ?", UserID).First(&user)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, result.Error
		}
	}

	return &user, nil
}

func (r *UserRepository) GetTariffByID(TariffID int64) (*entity.Tariff, error) {
	tariffs := map[int64]entity.Tariff{
		1: {ID: 1, Name: "Базовый 50 Мбит/с", Price: 300, Speed: 50},
		2: {ID: 2, Name: "Оптимальный 100 Мбит/с", Price: 500, Speed: 100},
		3: {ID: 3, Name: "Премиум 200 Мбит/с", Price: 800, Speed: 200},
	}

	tariff, exists := tariffs[TariffID]
	if !exists {
		return nil, fmt.Errorf("tariff not found")
	}

	return &tariff, nil
}

func (r *UserRepository) SetTariff(userID, tariffID int64) error {
	log.Printf("SetTariff: userID=%d, tariffID=%d", userID, tariffID)

	result := r.db.Model(&entity.User{}).
		Where("id = ?", userID).
		Update("tariff_id", tariffID)

	if result.Error != nil {
		log.Printf("Ошибка SetTariff: %v", result.Error)
		return result.Error
	}

	if result.RowsAffected == 0 {
		log.Printf("SetTariff: пользователь не найден")
		return fmt.Errorf("user not found")
	}

	log.Printf("SetTariff: успешно обновлено %d записей", result.RowsAffected)
	return nil
}

func (r *UserRepository) LoadTariff(user *entity.User, UserID string) error {
	result := r.db.First(user, UserID)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("пользователь не найден")
	}

	return nil
}

func (r *UserRepository) UpdateBalance(userID int64, amount float64) error {
	result := r.db.Model(&entity.User{}).
		Where("id = ?", userID).
		Update("balance", gorm.Expr("balance + ?", amount))

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("user not found")
	}

	return nil
}

func generateAccountNumber() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("NL%08d", rand.Intn(100000000))
}
