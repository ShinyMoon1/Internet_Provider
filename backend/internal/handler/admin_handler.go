package handler

import (
	"internet_provider/internal/entity"
	"internet_provider/internal/service"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	adminRepo *service.AdminService
}

func NewAdminHandler(ah *service.AdminService) *AdminHandler {
	return &AdminHandler{
		adminRepo: ah,
	}
}

func (h *AdminHandler) Login(c *gin.Context) {
	var req entity.AdminLoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	responce, err := h.adminRepo.Authenticate(req.Username, req.Password)

	if err != nil {
		log.Printf("Admin login failed for %s: %v", req.Username, err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	c.JSON(http.StatusOK, responce)
}

func (h *AdminHandler) GetDashboard(c *gin.Context) {
	stats, err := h.adminRepo.GetDashboardStats()

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

	user, total, err := h.adminRepo.GetUsers(search, filter, page, limit)
	if err != nil {
		log.Printf("Error getting users: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get users"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"search": search,
		"filter": filter,
		"page":   page,
		"user":   user,
		"total":  total,
	})
}

func (h *AdminHandler) VerifyToken(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
		return
	}

	if len(authHeader) > 7 && authHeader[:7] == "Bearer" {
		authHeader = authHeader[7:]
	}

	claims, err := h.adminRepo.VerifyJWT(authHeader)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"admin_id": claims["admin_id"],
		"username": claims["username"],
	})
}
