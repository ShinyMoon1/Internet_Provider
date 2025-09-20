package service

import "internet_provider/backend/internal/app"

type ApplicationService struct {
	repo app.ApplicationRepository
}

func NewApplicationService(repo app.ApplicationRepository) *ApplicationService {
	return &ApplicationService{repo: repo}
}

func (s *ApplicationService) CreateApplication(app *app.Application) error {
	if err := s.repo.Create(app); err != nil {
		return err
	}
	return nil
}

func (s *ApplicationService) GetApplicationByID(id uint) (*app.Application, error) {
	return s.repo.FindByID(id)
}

func (s *ApplicationService) GetAllApplications() ([]app.Application, error) {
	return s.repo.FindAll()
}

func (s *ApplicationService) UpdateApplications(app *app.Application) error {
	return s.repo.Update(app)
}

func (s *ApplicationService) DeleteApplications(id uint) error {
	return s.repo.Delete(id)
}

func (s *ApplicationService) FindStatusApplications(status string) ([]app.Application, error) {
	return s.repo.FindByStatus(status)
}
