package repository

import (
	"internet_provider/backend/internal/app"

	"gorm.io/gorm"
)

type GormApplicationRepository struct {
	db *gorm.DB
}

func NewGormApplicationRepository(db *gorm.DB) app.ApplicationRepository {
	return &GormApplicationRepository{db: db}
}

func (r *GormApplicationRepository) Create(application *app.Application) error {
	var nextID int64
	err := r.db.Raw("SELECT nextval('applications_id_seq')").Scan(&nextID).Error
	if err != nil {
		return err
	}

	application.ID = uint(nextID)

	return r.db.Exec(`
        INSERT INTO applications (id, customer_name, address, phone, plan, status) 
        VALUES (?, ?, ?, ?, ?, ?)
    `, application.ID, application.CustomerName, application.Address,
		application.Phone, application.Plan, "new").Error
}

func (r *GormApplicationRepository) Delete(id uint) error {
	return r.db.Delete(&app.Application{}, id).Error
}

func (r *GormApplicationRepository) Update(application *app.Application) error {
	return r.db.Save(application).Error
}

func (r *GormApplicationRepository) FindByID(id uint) (*app.Application, error) {
	var application app.Application
	err := r.db.First(&application, id).Error
	return &application, err
}

func (r *GormApplicationRepository) FindAll() ([]app.Application, error) {
	var application []app.Application
	err := r.db.Find(&application).Error
	return application, err
}

func (r *GormApplicationRepository) FindByStatus(status string) ([]app.Application, error) {
	var application []app.Application
	err := r.db.Where("status = ?", status).Find(&application).Error
	return application, err
}
