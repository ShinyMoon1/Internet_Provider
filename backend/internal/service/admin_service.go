package service

import (
	"errors"
	"fmt"
	"internet_provider/internal/entity"
	"internet_provider/internal/repository"
	"log"
	"strings"
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
	log.Printf("🔄 Generating JWT for admin: %s (ID: %d)", admin.Username, admin.ID)

	claims := jwt.MapClaims{
		"admin_id": admin.ID,
		"username": admin.Username,
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
		"iat":      time.Now().Unix(),
	}

	log.Printf("📋 JWT Claims: %+v", claims)

	// Создаем токен с правильным методом подписи
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	log.Printf("🔑 Using JWT Secret length: %d", len(s.jwtSecret))

	// Подписываем токен
	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		log.Printf("❌ JWT signing failed: %v", err)
		return "", err
	}

	log.Printf("✅ JWT generated successfully")
	log.Printf("📏 Token length: %d", len(tokenString))

	// Проверим что токен валидный
	log.Printf("🔍 Validating generated token...")
	testClaims, err := s.VerifyJWT(tokenString)
	if err != nil {
		log.Printf("❌ Generated token is invalid: %v", err)
		return "", fmt.Errorf("generated token is invalid: %v", err)
	}

	log.Printf("✅ Token validation successful: %+v", testClaims)
	return tokenString, nil
}

func (s *AdminService) VerifyJWT(tokenString string) (jwt.MapClaims, error) {
	log.Printf("🔐 Verifying token, length: %d", len(tokenString))

	// Проверим структуру токена перед парсингом
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token structure: expected 3 parts, got %d", len(parts))
	}

	log.Printf("🔍 Token parts: %d/%d/%d", len(parts[0]), len(parts[1]), len(parts[2]))

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		log.Printf("🔐 Token method: %v", token.Method)

		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Method)
		}

		log.Printf("✅ Using HMAC signing method")
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		log.Printf("❌ Token parse error: %v", err)
		return nil, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		log.Printf("✅ Token verified successfully")
		log.Printf("📋 Claims: admin_id=%v, username=%v", claims["admin_id"], claims["username"])
		return claims, nil
	}

	log.Printf("❌ Token invalid")
	return nil, fmt.Errorf("invalid token")
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
