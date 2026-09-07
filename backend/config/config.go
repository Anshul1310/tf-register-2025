package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	DatabaseURL         string
	JWTSecret           string
	AllowedOrigins      string
	FrontendURL         string
	TeamCap             int
	PaymentAmount       float64
	CashfreeAppID       string
	CashfreeSecretKey   string
	CashfreeEnvironment string
	CashfreeApiVersion  string
}

func LoadConfig() *Config {
	// Attempt to load .env file from current directory or parent directory
	environmentLoadError := godotenv.Load()
	if environmentLoadError != nil {
		// Attempt loading from backend directory if run from root
		_ = godotenv.Load("backend/.env")
	}

	serverPort := os.Getenv("PORT")
	if serverPort == "" {
		serverPort = "8000"
	}

	databaseConnectionURL := os.Getenv("PG_URL")
	if databaseConnectionURL == "" {
		databaseConnectionURL = os.Getenv("DATABASE_URL")
	}

	jwtSecretKey := os.Getenv("JWT_SECRET")
	if jwtSecretKey == "" {
		jwtSecretKey = "tf-register-secret-key-2025"
	}

	allowedOriginsList := os.Getenv("ALLOWED_ORIGINS")
	if allowedOriginsList == "" {
		allowedOriginsList = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
	}

	frontendApplicationURL := os.Getenv("VITE_PROD_URL_FRONTEND")
	if frontendApplicationURL == "" {
		frontendApplicationURL = "http://localhost:5173"
	}

	teamCapacityLimit := 50
	teamCapacityString := os.Getenv("TEAM_CAP")
	if teamCapacityString != "" {
		parsedCapacity, parseError := strconv.Atoi(teamCapacityString)
		if parseError == nil && parsedCapacity > 0 {
			teamCapacityLimit = parsedCapacity
		}
	}

	registrationPaymentAmount := 200.0
	paymentAmountString := os.Getenv("PAYMENT_AMOUNT")
	if paymentAmountString != "" {
		parsedAmount, parseAmountError := strconv.ParseFloat(paymentAmountString, 64)
		if parseAmountError == nil && parsedAmount > 0 {
			registrationPaymentAmount = parsedAmount
		}
	}

	cashfreeApplicationIdentifier := os.Getenv("CASHFREE_APP_ID")
	cashfreeSecretAPIKey := os.Getenv("CASHFREE_SECRET_KEY")

	cashfreeEnvironmentMode := os.Getenv("CASHFREE_ENV")
	if cashfreeEnvironmentMode == "" {
		cashfreeEnvironmentMode = "PRODUCTION"
	}

	cashfreeAPIVersionHeader := os.Getenv("CASHFREE_API_VERSION")
	if cashfreeAPIVersionHeader == "" {
		cashfreeAPIVersionHeader = "2023-08-01"
	}

	log.Printf("Loaded configuration with port: %s, cashfree mode: %s", serverPort, cashfreeEnvironmentMode)

	return &Config{
		Port:                serverPort,
		DatabaseURL:         databaseConnectionURL,
		JWTSecret:           jwtSecretKey,
		AllowedOrigins:      allowedOriginsList,
		FrontendURL:         frontendApplicationURL,
		TeamCap:             teamCapacityLimit,
		PaymentAmount:       registrationPaymentAmount,
		CashfreeAppID:       cashfreeApplicationIdentifier,
		CashfreeSecretKey:   cashfreeSecretAPIKey,
		CashfreeEnvironment: cashfreeEnvironmentMode,
		CashfreeApiVersion:  cashfreeAPIVersionHeader,
	}
}
