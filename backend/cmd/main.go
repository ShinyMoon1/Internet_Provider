package main

import (
	"internet_provider/config"
	"time"

	"internet_provider/internal/app"
	"internet_provider/internal/handler"
	"internet_provider/internal/repository"
	"internet_provider/internal/service"
	"internet_provider/internal/storage"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func main() {
	cfg, err := config.LoadConf("config.yaml")
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	db, err := storage.ConnectPostgres(cfg)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err := autoMigrate(db); err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	appRepo := repository.NewGormApplicationRepository(db)
	appService := service.NewApplicationService(appRepo)
	pdfService := service.NewPDFService()
	appHandler := handler.NewApplicationHandler(appService, pdfService)

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://127.0.0.1:5500", "http://localhost:5500"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	setupRouters(router, appHandler)

	log.Printf("Server starting on port %s", cfg.Server.Port)
	if err := router.Run(":" + cfg.Server.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func autoMigrate(db *gorm.DB) error {
	db.Migrator().DropTable(&app.Application{})
	return db.AutoMigrate(&app.Application{})
}

func setupRouters(router *gin.Engine, handler *handler.ApplicationHandler) {
	api := router.Group("/api/v1")
	{
		applications := api.Group("/applications")
		{
			applications.POST("", handler.CreateApplication)
			applications.GET("", handler.ListApplications)
			applications.GET("/:id", handler.GetApplication)
			applications.GET("/:id/pdf", handler.DownloadPDF)
		}
	}
}
