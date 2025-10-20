package entity

type User struct {
	Id            int     `gorm:"primaryKey;autoIncrement" json:"id"`
	Name          string  `gorm:"size:100;not null" json:"name"`
	Email         string  `gorm:"size:100;uniqueIndex;not null" json:"email"`
	Phone         string  `gorm:"size:20;not null" json:"phone"`
	PasswordHash  string  `gorm:"size:255;not null" json:"-"`
	AccountNumber string  `gorm:"size:20;uniqueIndex;not null" json:"accountn"`
	Balance       float64 `gorm:"type:decimal(10,2);default:0.00" json:"balance"`
	TariffID      *int     `gorm:"default:null" json:"tariff_id"`
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Phone    string `json:"phone" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}
