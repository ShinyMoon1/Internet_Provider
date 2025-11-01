package handler

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"internet_provider/internal/entity"
	"internet_provider/internal/service"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	adminService *service.AdminService
}

func NewAdminHandler(ah *service.AdminService) *AdminHandler {
	return &AdminHandler{
		adminService: ah,
	}
}

func (h *AdminHandler) Login(c *gin.Context) {
	var req entity.AdminLoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	responce, err := h.adminService.Authenticate(req.Username, req.Password)

	if err != nil {
		log.Printf("Admin login failed for %s: %v", req.Username, err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, responce)
}

func (h *AdminHandler) GetDashboard(c *gin.Context) {
	stats, err := h.adminService.GetDashboardStats()

	if err != nil {
		log.Printf("Error getting dashboard stats: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get dashboard data"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

func (h *AdminHandler) GetUsers(c *gin.Context) {
	search := c.Query("search")
	filter := c.Query("filter")

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	users, total, err := h.adminService.GetUsers(search, filter, page, limit)
	if err != nil {
		log.Printf("Error getting users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"search": search,
		"filter": filter,
		"page":   page,
		"user":   users,
		"total":  total,
	})
}

func (h *AdminHandler) VerifyToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
		return
	}

	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		authHeader = strings.TrimSpace(authHeader[7:])
	}

	claims, err := h.adminService.VerifyJWT(authHeader)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"admin_id": claims["admin_id"],
		"username": claims["username"],
	})
}

// DebugToken - полная диагностика токена
func (h *AdminHandler) DebugToken(c *gin.Context) {
	var request struct {
		Token string `json:"token"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("🔧 [DebugToken] Starting debug for token: %s", request.Token)

	// 1. Проверим структуру токена
	parts := strings.Split(request.Token, ".")
	if len(parts) != 3 {
		c.JSON(http.StatusOK, gin.H{
			"error": fmt.Sprintf("Invalid token structure: expected 3 parts, got %d", len(parts)),
			"parts": len(parts),
		})
		return
	}

	log.Printf("🔧 [DebugToken] Token parts: %d/%d/%d", len(parts[0]), len(parts[1]), len(parts[2]))

	// 2. Попробуем декодировать header
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"error":  "Header decode failed: " + err.Error(),
			"header": parts[0],
		})
		return
	}

	var header map[string]interface{}
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"error":      "Header JSON parse failed: " + err.Error(),
			"header_raw": string(headerBytes),
		})
		return
	}

	// 3. Попробуем декодировать payload
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"error":   "Payload decode failed: " + err.Error(),
			"payload": parts[1],
		})
		return
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"error":       "Payload JSON parse failed: " + err.Error(),
			"payload_raw": string(payloadBytes),
		})
		return
	}

	// 4. Пробуем верифицировать
	claims, err := h.adminService.VerifyJWT(request.Token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"error":            "Verification failed: " + err.Error(),
			"header":           header,
			"payload":          payload,
			"signature_length": len(parts[2]),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "valid",
		"claims":  claims,
		"header":  header,
		"payload": payload,
	})
}
