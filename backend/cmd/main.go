package main

import (
	"internet_provider/backend/config"

	"internet_provider/backend/internal/app"
	"internet_provider/backend/internal/handler"
	"internet_provider/backend/internal/repository"
	"internet_provider/backend/internal/service"
	"internet_provider/backend/internal/storage"
	"log"

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
	appHandler := handler.NewApplicationHandler(appService)

	router := gin.Default()
	setupRouters(router, appHandler)

	log.Printf("Server starting on port %s", cfg.Server.Port)
	if err := router.Run(":" + cfg.Server.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func autoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&app.Application{})
}

func setupRouters(router *gin.Engine, handler *handler.ApplicationHandler) {
	api := router.Group("/api/v1")
	{
		applications := api.Group("/applications")
		{
			applications.POST("", handler.CreateApplication)
			applications.GET("", handler.ListApplications)
			applications.GET("/id", handler.GetApplications)
		}
	}
}
