package repository

import (
	"internet_provider/internal/entity"
	"time"

	"gorm.io/gorm"
)

type GormAdminRepository struct {
	db *gorm.DB
}

func NewGormAdminRepository(db *gorm.DB) *GormAdminRepository {
	return &GormAdminRepository{
		db: db,
	}
}

func (r *GormAdminRepository) FindByUsername(username string) (*entity.Admin, error) {
	var admin entity.Admin
	result := r.db.Where("username = ? AND is_active = ?", username, true).First(&admin)
	if result.Error != nil {
		return nil, result.Error
	}

	return &admin, nil
}

func (r *GormAdminRepository) DashboardStats() (*entity.DashboardList, error) {
	var stats entity.DashboardList

	r.db.Model(&entity.User{}).Count(&stats.TotalUsers)

	r.db.Model(&entity.Payment{}).Count(&stats.TotalPayments)

	r.db.Model(&entity.Payment{}).Where("amount > 0").Select("COALESCE(SUM(amount), 0)").Scan(&stats.TotalPayments)

	today := time.Now().Format("2006-01-02")

	r.db.Model(&entity.Payment{}).Where("amount > 0 AND DATE(created_at) = ?", today).Select("COALESCE(SUM(amount), 0)").Scan(&stats.RevenuToday)

	return &stats, nil
}

func (r *GormAdminRepository) GetUsers(search string, filter string, page, limit int) ([]entity.AdminUserList, int64, error) {
	var users []entity.AdminUserList
	var total int64

	query := r.db.Model(&entity.User{}).Select("users.id, users.name, users.email, users.phone, users.balance, users.tariff_id, tariffs.name as tariff_name, users.created_at").
		Joins("LEFT JOIN tariffs ON users.tariff_id = tariffs.id")

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("users.name ILIKE ? OR users.email ILIKE ?", searchPattern, searchPattern)
	}

	switch filter {
	case "with_tariff":
		query = query.Where("users.tariff_id IS NOT NULL")
	case "without_tariff":
		query = query.Where("users.tariff_id IS NULL")
	}

	query.Count(&total)

	offset := (page - 1) * limit

	err := query.Order("users.created_at DESC").Offset(offset).Limit(limit).Find(&users).Error

	if err != nil {
		return nil, 0, err
	}
	return users, total, nil
}
