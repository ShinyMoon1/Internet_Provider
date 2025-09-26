package app

import (
	"errors"
	"time"
)

var (
	ErrInvalidPhoneNumber   = errors.New("некоректный номер телефона")
	ErrCustomerNameRequired = errors.New("поле имени не должно быть пустым")
)

type Application struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	CustomerName string    `gorm:"not null" json:"customer_name"`
	Address      string    `gorm:"not null" json:"address"`
	Phone        string    `gorm:"not null" json:"phone"`
	Plan         string    `json:"plan"`
	Status       string    `gorm:"default:'new'" json:"status"`
	CreatedAt    time.Time `gorm:"type:timestamp;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt    time.Time `gorm:"type:timestamp;default:CURRENT_TIMESTAMP;autoUpdateTime" json:"updated_at"`
}

type ApplicationRepository interface {
	Create(application *Application) error
	FindByID(id uint) (*Application, error)
	FindAll() ([]Application, error)
	Update(application *Application) error
	Delete(id uint) error
	FindByStatus(status string) ([]Application, error)
}
