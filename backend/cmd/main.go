package main

import (
	"internet_provider/config"
	"time"

	"internet_provider/internal/app"
	"internet_provider/internal/entity"
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

	paymentRepo := repository.NewPaymentRepository(db)

	userRepo := repository.NewUserRepository(db)
	authHandler := handler.NewAuthHandler(userRepo)

	paymenthandler := handler.NewPaymentHandler(paymentRepo)

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://127.0.0.1:5500", "http://localhost:5500"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	setupRouters(router, appHandler, authHandler, paymenthandler)

	log.Printf("Server starting on port %s", cfg.Server.Port)
	if err := router.Run(":" + cfg.Server.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func autoMigrate(db *gorm.DB) error {
	if db.Migrator().HasTable(&entity.User{}) {
		if !db.Migrator().HasColumn(&entity.User{}, "TariffID") {
			err := db.Migrator().AddColumn(&entity.User{}, "TariffID")
			if err != nil {
				log.Printf("Ошибка добавления tariff_id: %v", err)
				return err
			}
			log.Println("Добавлен столбец tariff_id в таблицу users")
		}
	}

	tables := []interface{}{
		&app.Application{},
		&entity.User{},
		&entity.Payment{},
	}

	for _, table := range tables {
		if !db.Migrator().HasTable(table) {
			if err := db.Migrator().CreateTable(table); err != nil {
				return err
			}
			log.Printf("Table created for %T", table)
		}
	}

	return nil
}

func setupRouters(router *gin.Engine, handler *handler.ApplicationHandler, authHandler *handler.AuthHandler, payHandler *handler.PaymentHandler) {
	api := router.Group("/api/v1")
	{
		applications := api.Group("/applications")
		{
			applications.POST("", handler.CreateApplication)
			applications.GET("", handler.ListApplications)
			applications.GET("/:id", handler.GetApplication)
			applications.GET("/:id/pdf", handler.DownloadPDF)
		}

		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/activate-tariff", authHandler.ActivateTarrif)
			auth.GET("/:id", authHandler.GetUserProfile)
		}

		pay := api.Group("/pay")
		{
			pay.POST("/:id", payHandler.ToUpBalance)
		}
	}
}
