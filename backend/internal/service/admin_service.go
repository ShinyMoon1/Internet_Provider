package service

import (
	"errors"
	"internet_provider/internal/entity"
	"internet_provider/internal/repository"
	"log"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AdminService struct {
	adminRepo *repository.GormAdminRepository
	jwtSecret string
}

func NewAdminService(admin *repository.GormAdminRepository, jwtSecret string) *AdminService {
	return &AdminService{
		adminRepo: admin,
		jwtSecret: jwtSecret,
	}
}

func (s *AdminService) Authenticate(username, password string) (*entity.AdminLoginResponse, error) {
	admin, err := s.adminRepo.FindByUsername(username)
	if err != nil {
		log.Printf("Admin not found: %v", err)
		return nil, errors.New("invalid credentials")
	}

	err = bcrypt.CompareHashAndPassword([]byte(admin.Password), []byte(password))
	if err != nil {
		log.Printf("Invalid password for admin: %s", username)
		return nil, errors.New("invalid credentials")
	}

	token, err := s.GenerateJWT(admin)
	if err != nil {
		return nil, err
	}

	response := &entity.AdminLoginResponse{
		Token: token,
	}

	response.Admin.ID = admin.ID
	response.Admin.Username = admin.Username
	response.Admin.Email = admin.Email

	return response, nil
}

func (s *AdminService) GenerateJWT(admin *entity.Admin) (string, error) {
	claims := jwt.MapClaims{
		"admin_id": admin.ID,
		"username": admin.Username,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	return token.SignedString([]byte(s.jwtSecret))
}

func (s *AdminService) VerifyJWT(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Проверяем алгоритм подписи
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}

func (s *AdminService) GetDashboardStats() (*entity.DashboardList, error) {
	return s.adminRepo.DashboardStats()
}

func (s *AdminService) GetUsers(search, filter string, page, limit int) ([]entity.AdminUserList, int64, error) {
	if page < 1 {
		page = 1
	}

	if limit < 1 || limit > 100 {
		limit = 20
	}

	return s.adminRepo.GetUsers(search, filter, page, limit)
}
