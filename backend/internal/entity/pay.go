package entity

import "time"

type Payment struct {
	ID            int       `gorm:"primaryKey" json:"id"`
	UserID        int       `gorm:"not null;index" json:"user_id"`
	Amount        float64   `gorm:"not null" json:"amount"`
	Status        string    `gorm:"type:varchar(20);not null;default:'pending'" json:"status"`
	PaymentMethod string    `gorm:"type:varchar(50);not null" json:"payment_method"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
