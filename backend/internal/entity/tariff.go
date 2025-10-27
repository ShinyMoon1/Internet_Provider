package entity

type Tariff struct {
	ID    int64   `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Speed int     `json:"speed"`
}
