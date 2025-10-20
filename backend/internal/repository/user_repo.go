package repository

import (
	"fmt"
	"internet_provider/internal/entity"
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

func (r *UserRepository) SetTariff(UserID int, TariffID int) error {
	result := r.db.Model(&entity.User{}).Where("id = ?", UserID).Update("tariff_id", TariffID)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("пользователь с ID %d не найден", UserID)
	}

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

func generateAccountNumber() string {
	rand.Seed(time.Now().UnixNano())
	return fmt.Sprintf("NL%08d", rand.Intn(100000000))
}
