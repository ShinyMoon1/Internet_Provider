package entity

import "time"

type Admin struct {
	ID        int64     `json:"id" gorm:"primaryKey"`
	Username  string    `json:"username" gorm:"uniqueIndex;size:50;not null"`
	Password  string    `json:"-" gorm:"size:255;not null"`
	Email     string    `json:"email" gorm:"size:100"`
	IsActive  bool      `json:"is_active" gorm:"default:true"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AdminLoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type AdminLoginResponse struct {
	Token string `json:"token"`
	Admin struct {
		ID       int64  `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	} `json:"admin"`
}

type DashboardList struct {
	TotalUsers    int64   `json:"total_users"`
	TotalPayments int64   `json:"total_payments"`
	NewUsersToday int64   `json:"new_users_today"`
	RevenuToday   float64 `json:"revenu_today"`
}

type AdminUserList struct {
	ID            int64   `json:"id"`
	Name          string  `json:"name"`
	Email         string  `json:"email"`
	Phone         string  `json:"phone"`
	AccountNumber string  `json:"account_number"`
	Balance       float64 `json:"balance"`
	TariffID      *int64  `json:"tariff_id"`
	TariffName    *string `json:"tariff_name"`
}
