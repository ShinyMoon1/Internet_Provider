package handler

import (
	"internet_provider/internal/app"
	"internet_provider/internal/service"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type ApplicationHandler struct {
	service *service.ApplicationService
	pdf     *service.PDFService
}

func NewApplicationHandler(service *service.ApplicationService, pdf *service.PDFService) *ApplicationHandler {
	return &ApplicationHandler{
		service: service,
		pdf:     pdf,
	}
}

func (h *ApplicationHandler) CreateApplication(c *gin.Context) {
	var app app.Application
	if err := c.ShouldBindJSON(&app); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.CreateApplication(&app); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, app)
}

func (h *ApplicationHandler) GetApplication(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	app, err := h.service.GetApplicationByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, app)
}

func (h *ApplicationHandler) ListApplications(c *gin.Context) {
	app, err := h.service.GetAllApplications()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, app)
}

func (h *ApplicationHandler) CreateApplicationPDF(c *gin.Context) {
	var application app.Application

	// Получаем данные из формы
	if err := c.ShouldBindJSON(&application); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверные данные: " + err.Error()})
		return
	}

	// Проверяем обязательные поля
	if application.CustomerName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Имя клиента обязательно"})
		return
	}
	if application.Phone == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Телефон обязателен"})
		return
	}
	if application.Address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Адрес обязателен"})
		return
	}

	// Создаем заявку в базе данных
	if err := h.service.CreateApplication(&application); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка сохранения: " + err.Error()})
		return
	}

	// Генерируем PDF
	pdfBuffer, err := h.pdf.GenerateApplicationPDF(&application)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации PDF: " + err.Error()})
		return
	}

	// Отправляем PDF файл пользователю
	filename := "заявка_на_подключение_" + strconv.Itoa(int(application.ID)) + ".pdf"

	// Устанавливаем заголовки для скачивания файла
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Cache-Control", "no-cache")

	// Отправляем PDF
	c.Data(http.StatusOK, "application/pdf", pdfBuffer.Bytes())
}

func (h *ApplicationHandler) DownloadPDF(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Неверный ID"})
		return
	}

	application, err := h.service.GetApplicationByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Заявка не найдена"})
		return
	}

	pdfBuffer, err := h.pdf.GenerateApplicationPDF(application)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка генерации PDF"})
		return
	}

	filename := "заявка_" + strconv.Itoa(int(application.ID)) + ".pdf"
	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, "application/pdf", pdfBuffer.Bytes())
}
