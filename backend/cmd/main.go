package main

import (
	"internet_provider/config"
	"time"

	"internet_provider/internal/app"
	"internet_provider/internal/entity"
	"internet_provider/internal/handler"
	"internet_provider/internal/middleware"
	"internet_provider/internal/repository"
	"internet_provider/internal/service"
	"internet_provider/internal/storage"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
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

	if err := createDefaultAdmin(db); err != nil {
		log.Fatal("Failed to create default admin:", err)
	}

	appRepo := repository.NewGormApplicationRepository(db)
	appService := service.NewApplicationService(appRepo)
	pdfService := service.NewPDFService()
	appHandler := handler.NewApplicationHandler(appService, pdfService)

	paymentRepo := repository.NewPaymentRepository(db)

	userRepo := repository.NewUserRepository(db)
	authHandler := handler.NewAuthHandler(userRepo)

	paymenthandler := handler.NewPaymentHandler(paymentRepo)

	adminRepo := repository.NewGormAdminRepository(db)
	adminSevice := service.NewAdminService(adminRepo, "zGuui2cfiVi9yLCMiilfIEbCAVzkFkWA7OiShxxi4ML")
	adminHandler := handler.NewAdminHandler(adminSevice)
	adminAuth := middleware.AdminAuthMiddleware(adminSevice)

	router := gin.Default()
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://127.0.0.1:5500", "http://localhost:5500"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))
	setupRouters(router, appHandler, authHandler, paymenthandler, adminHandler, adminAuth)

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
		&entity.Tariff{},
		&entity.Admin{},
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

func setupRouters(router *gin.Engine, handler *handler.ApplicationHandler, authHandler *handler.AuthHandler,
	payHandler *handler.PaymentHandler, adminHandler *handler.AdminHandler, adminAuth gin.HandlerFunc) {
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

		admin := api.Group("/admin")
		{
			admin.POST("/login", adminHandler.Login)
			admin.GET("/verify", adminHandler.VerifyToken)
			admin.POST("/debug-token", adminHandler.DebugToken)

			authorized := admin.Group("")
			authorized.Use(adminAuth)
			{
				authorized.GET("/dashboard", adminHandler.GetDashboard)
				authorized.GET("/users", adminHandler.GetUsers)
				authorized.GET("/payments", payHandler.GetPayments)
			}
		}
	}
}

func createDefaultAdmin(db *gorm.DB) error {
	log.Println("🔄 Checking for default admin...")

	var count int64
	db.Model(&entity.Admin{}).Count(&count)
	log.Printf("Current admins in DB: %d", count)

	if count == 0 {
		log.Println("📝 Creating default admin...")

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		admin := &entity.Admin{
			Username: "admin",
			Password: string(hashedPassword),
			Email:    "admin@netlink.ru",
			IsActive: true,
		}

		if err := db.Create(admin).Error; err != nil {
			return err
		}

		log.Printf("✅ Default admin created successfully!")
		log.Printf("👤 Username: admin")
		log.Printf("🔑 Password: admin123")
		log.Printf("📧 Email: %s", admin.Email)
	} else {
		log.Println("✅ Admin already exists in database")
	}

	return nil
}
