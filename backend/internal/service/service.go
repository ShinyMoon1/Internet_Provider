package service

import (
	"bytes"
	"fmt"
	"internet_provider/internal/app"
	"time"

	"github.com/signintech/gopdf"
)

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

func (s *ApplicationService) DeleteApplications(id uint) error {
	return s.repo.Delete(id)
}

func (s *ApplicationService) FindStatusApplications(status string) ([]app.Application, error) {
	return s.repo.FindByStatus(status)
}

type PDFService struct {
	fontsPath string
}

func NewPDFService() *PDFService {
	return &PDFService{
		fontsPath: "assets/fonts",
	}
}

func (s *PDFService) GenerateApplicationPDF(application *app.Application) (*bytes.Buffer, error) {
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddPage()

	// Шрифт
	err := pdf.AddTTFFont("dejavusans", "../fonts/DejaVuSans.ttf")
	if err != nil {
		err = pdf.AddTTFFont("times", "assets/fonts/times.ttf")
		if err != nil {
			return s.createSimplePDF(application)
		}
		pdf.SetFont("times", "", 11)
	} else {
		pdf.SetFont("dejavusans", "", 11)
	}

	// === ЦВЕТА В СТИЛЕ NETLINK ===
	primaryColor := gopdf.RGBColor{R: 59, G: 130, B: 246} // Синий из стиля
	// accentColor := gopdf.RGBColor{R: 99, G: 102, B: 241}  // Фиолетовый акцент
	darkColor := gopdf.RGBColor{R: 30, G: 41, B: 59}    // Темный
	grayColor := gopdf.RGBColor{R: 107, G: 114, B: 128} // Серый
	lightGray := gopdf.RGBColor{R: 243, G: 244, B: 246} // Светло-серый

	// === ШАПКА С ЛОГОТИПОМ ===
	pdf.SetFillColor(lightGray.R, lightGray.G, lightGray.B)
	pdf.Rectangle(0, 0, 595, 80, "F", 0, 0)

	pdf.SetFillColor(primaryColor.R, primaryColor.G, primaryColor.B)
	pdf.Rectangle(40, 25, 70, 55, "F", 0, 0)

	pdf.SetFontSize(16)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetX(45)
	pdf.SetY(35)
	pdf.Cell(nil, "NL")

	pdf.SetFontSize(20)
	pdf.SetTextColor(darkColor.R, darkColor.G, darkColor.B)
	pdf.SetX(80)
	pdf.SetY(32)
	pdf.Cell(nil, "NetLink")

	pdf.SetFontSize(10)
	pdf.SetTextColor(grayColor.R, grayColor.G, grayColor.B)
	pdf.SetX(80)
	pdf.SetY(50)
	pdf.Cell(nil, "Скоростной интернет для дома и бизнеса")

	pdf.SetY(90)

	// === ЗАГОЛОВОК ДОКУМЕНТА ===
	pdf.SetFontSize(24)
	pdf.SetTextColor(darkColor.R, darkColor.G, darkColor.B)
	pdf.Cell(nil, "Заявка на подключение")
	pdf.Br(5)

	pdf.SetFontSize(16)
	pdf.SetTextColor(primaryColor.R, primaryColor.G, primaryColor.B)
	pdf.Cell(nil, "№"+fmt.Sprintf("%d", application.ID))
	pdf.Br(25)

	// === КАРТОЧКА С ДАННЫМИ ===
	s.drawCard(&pdf, 40, pdf.GetY(), 515, 180, lightGray)

	pdf.SetY(pdf.GetY() + 20)
	pdf.SetX(60)

	// Данные в две колонки
	leftColumn := []struct {
		Label string
		Value string
	}{
		{"Клиент:", application.CustomerName},
		{"Адрес:", application.Address},
		{"Телефон:", application.Phone},
	}

	rightColumn := []struct {
		Label string
		Value string
	}{
		{"Тариф:", application.Plan},
		{"Статус:", application.Status},
		{"Дата:", application.CreatedAt.Format("02.01.2006")},
	}

	// Левая колонка
	for _, item := range leftColumn {
		pdf.SetX(60)
		pdf.SetFontSize(11)
		pdf.SetTextColor(grayColor.R, grayColor.G, grayColor.B)
		pdf.Cell(nil, item.Label)

		pdf.SetX(180)
		pdf.SetFontSize(12)
		pdf.SetTextColor(darkColor.R, darkColor.G, darkColor.B)
		pdf.Cell(nil, item.Value)
		pdf.Br(20)
	}

	// Правая колонка
	pdf.SetY(pdf.GetY() - 60) // Возвращаемся наверх
	for _, item := range rightColumn {
		pdf.SetX(320)
		pdf.SetFontSize(11)
		pdf.SetTextColor(grayColor.R, grayColor.G, grayColor.B)
		pdf.Cell(nil, item.Label)

		pdf.SetX(400)
		pdf.SetFontSize(12)
		pdf.SetTextColor(darkColor.R, darkColor.G, darkColor.B)
		pdf.Cell(nil, item.Value)
		pdf.Br(20)
	}

	pdf.SetY(200)

	// === УСЛОВИЯ ПОДКЛЮЧЕНИЯ ===
	pdf.SetFontSize(18)
	pdf.SetTextColor(darkColor.R, darkColor.G, darkColor.B)
	pdf.Cell(nil, "Условия подключения")
	pdf.Br(20)

	conditions := []struct {
		Text    string
		Details string
	}{
		{"Высокая скорость", "До 1 Гбит/с без ограничений"},
		{"Надежность", "99.9% гарантия стабильности"},
		{"Поддержка 24/7", "Круглосуточная техническая помощь"},
		{"Прозрачность", "Никаких скрытых платежей"},
	}

	for _, cond := range conditions {
		s.drawFeatureCard(&pdf, cond.Text, cond.Details)
		pdf.Br(15)
	}

	pdf.Br(30)

	// === ПОДПИСИ И ФУТЕР ===
	pdf.SetLineWidth(0.5)
	pdf.SetStrokeColor(lightGray.R, lightGray.G, lightGray.B)
	pdf.Line(40, pdf.GetY(), 555, pdf.GetY())
	pdf.Br(20)

	// Подписи в строку
	pdf.SetFontSize(11)
	pdf.SetTextColor(grayColor.R, grayColor.G, grayColor.B)

	// Клиент
	pdf.SetX(60)
	pdf.Cell(nil, "Подпись клиента")
	pdf.SetX(60)
	pdf.SetY(pdf.GetY() + 5)
	pdf.Cell(nil, "___________________")
	pdf.SetX(60)
	pdf.SetY(pdf.GetY() + 15)
	pdf.Cell(nil, time.Now().Format("02.01.2006"))

	// Сотрудник
	pdf.SetX(350)
	pdf.SetY(pdf.GetY() - 20)
	pdf.Cell(nil, "Подпись сотрудника")
	pdf.SetX(350)
	pdf.SetY(pdf.GetY() + 5)
	pdf.Cell(nil, "___________________")
	pdf.SetX(350)
	pdf.SetY(pdf.GetY() + 15)
	pdf.Cell(nil, "М.П.")

	// Футер
	pdf.SetY(800)
	pdf.SetFontSize(9)
	pdf.SetTextColor(grayColor.R, grayColor.G, grayColor.B)
	pdf.Cell(nil, "NetLink · +7 (800) 555-35-35 · info@netlink.ru")
	pdf.SetX(400)
	pdf.Cell(nil, "Страница 1 из 1")

	var buf bytes.Buffer
	err = pdf.Write(&buf)
	if err != nil {
		return nil, err
	}

	return &buf, nil
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

func (s *PDFService) drawCard(pdf *gopdf.GoPdf, x, y, width, height float64, bgColor gopdf.RGBColor) {
	pdf.SetFillColor(bgColor.R, bgColor.G, bgColor.B)
	pdf.Rectangle(x, y, x+width, y+height, "F", 5, 5)

	pdf.SetLineWidth(0.5)
	pdf.SetStrokeColor(200, 200, 200)
	pdf.Rectangle(x, y, x+width, y+height, "D", 5, 5)
}

func (s *PDFService) drawFeatureCard(pdf *gopdf.GoPdf, title, description string) {
	pdf.SetX(50)

	// Заголовок
	pdf.SetX(70)
	pdf.SetFontSize(12)
	pdf.SetTextColor(0, 0, 0)
	pdf.Cell(nil, title)

	// Описание
	pdf.SetX(200)
	pdf.SetFontSize(11)
	pdf.SetTextColor(100, 100, 100)
	pdf.Cell(nil, description)
}

func (s *PDFService) createSimplePDF(application *app.Application) (*bytes.Buffer, error) {
	// Упрощенная версия в том же стиле
	pdf := gopdf.GoPdf{}
	pdf.Start(gopdf.Config{PageSize: *gopdf.PageSizeA4})
	pdf.AddPage()

	pdf.SetFontSize(20)
	pdf.Cell(nil, "NetLink")
	pdf.Br(10)
	pdf.SetFontSize(16)
	pdf.Cell(nil, "Заявка №"+fmt.Sprintf("%d", application.ID))
	pdf.Br(20)

	data := []string{
		"Клиент: " + application.CustomerName,
		"Адрес: " + application.Address,
		"Телефон: " + application.Phone,
		"Тариф: " + application.Plan,
		"Статус: " + application.Status,
	}

	pdf.SetFontSize(12)
	for _, line := range data {
		pdf.Cell(nil, line)
		pdf.Br(15)
	}

	var buf bytes.Buffer
	err := pdf.Write(&buf)
	return &buf, err
}
