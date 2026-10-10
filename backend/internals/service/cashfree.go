package service

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/Anshul1310/tf-register/config"
	"github.com/Anshul1310/tf-register/internals/models"
	"github.com/Anshul1310/tf-register/internals/repository"
)

type CashfreeService struct {
	configuration  *config.Config
	teamRepository *repository.TeamRepository
	userRepository *repository.UserRepository
	httpClient     *http.Client
}

func NewCashfreeService(
	configuration *config.Config,
	teamRepository *repository.TeamRepository,
	userRepository *repository.UserRepository,
) *CashfreeService {
	return &CashfreeService{
		configuration:  configuration,
		teamRepository: teamRepository,
		userRepository: userRepository,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (cashfreeService *CashfreeService) getCashfreeBaseURL() string {
	if strings.ToUpper(cashfreeService.configuration.CashfreeEnvironment) == "SANDBOX" {
		return "https://sandbox.cashfree.com/pg"
	}
	return "https://api.cashfree.com/pg"
}

func (cashfreeService *CashfreeService) CreatePaymentOrder(
	requestContext context.Context,
	teamIdentifier string,
	userIdentifier string,
	teamName string,
) (*models.CashfreeOrderResponse, error) {
	teamRecord, findTeamError := cashfreeService.teamRepository.FindTeamByID(requestContext, teamIdentifier)
	if findTeamError != nil {
		return nil, fmt.Errorf("failed to verify team: %w", findTeamError)
	}
	if teamRecord == nil {
		return nil, errors.New("team not found")
	}

	memberCount, countError := cashfreeService.teamRepository.CountTeamMembers(requestContext, teamIdentifier)
	if countError != nil {
		return nil, fmt.Errorf("failed to count team members: %w", countError)
	}
	if memberCount < 4 && cashfreeService.configuration.CashfreeAppID != "" {
		return nil, fmt.Errorf("team needs at least 4 members to initiate payment (current members: %d)", memberCount)
	}

	if teamRecord.PaymentStatus == "PAID" {
		return nil, errors.New("payment has already been completed for this team")
	}

	// Prepare order identifiers
	uniqueOrderIdentifier := fmt.Sprintf("order_%s_%d", teamIdentifier, time.Now().Unix())
	customerPhone := strings.TrimSpace(teamRecord.Contact)
	if len(customerPhone) < 10 {
		customerPhone = "9999999999"
	}

	customerEmail := teamRecord.Leader
	if customerEmail == "" {
		customerEmail = "participant@transfinitte.com"
	}

	customerName := teamName
	if customerName == "" {
		customerName = teamRecord.Name
	}

	returnURL := fmt.Sprintf("%s/team/%s?order_id={order_id}", cashfreeService.configuration.FrontendURL, teamIdentifier)

	cashfreeOrderPayload := map[string]interface{}{
		"order_id":       uniqueOrderIdentifier,
		"order_amount":   cashfreeService.configuration.PaymentAmount,
		"order_currency": "INR",
		"customer_details": map[string]interface{}{
			"customer_id":    teamIdentifier,
			"customer_email": customerEmail,
			"customer_phone": customerPhone,
			"customer_name":  customerName,
		},
		"order_meta": map[string]interface{}{
			"return_url": returnURL,
		},
		"order_note": fmt.Sprintf("Registration fee for team %s", teamRecord.Name),
	}

	// If Cashfree credentials are not configured, generate a mock session ID for sandbox testing
	if cashfreeService.configuration.CashfreeAppID == "" || cashfreeService.configuration.CashfreeSecretKey == "" {
		log.Println("Cashfree API credentials not configured in environment; providing sandbox demonstration session")
		mockSessionID := fmt.Sprintf("session_mock_%s_%d", teamIdentifier, time.Now().Unix())
		_ = cashfreeService.teamRepository.RecordPaymentLog(
			requestContext,
			uniqueOrderIdentifier,
			uniqueOrderIdentifier,
			teamIdentifier,
			cashfreeService.configuration.PaymentAmount,
			"CREATED",
			mockSessionID,
			"",
			"",
			"",
		)
		return &models.CashfreeOrderResponse{
			PaymentSessionID: mockSessionID,
			OrderID:          uniqueOrderIdentifier,
			OrderStatus:      "ACTIVE",
			OrderAmount:      cashfreeService.configuration.PaymentAmount,
			OrderCurrency:    "INR",
		}, nil
	}

	serializedPayload, serializationError := json.Marshal(cashfreeOrderPayload)
	if serializationError != nil {
		return nil, fmt.Errorf("failed to serialize Cashfree order request: %w", serializationError)
	}

	ordersEndpointURL := fmt.Sprintf("%s/orders", cashfreeService.getCashfreeBaseURL())
	httpRequest, requestBuildError := http.NewRequestWithContext(
		requestContext,
		http.MethodPost,
		ordersEndpointURL,
		bytes.NewBuffer(serializedPayload),
	)
	if requestBuildError != nil {
		return nil, fmt.Errorf("failed to create http request: %w", requestBuildError)
	}

	httpRequest.Header.Set("Content-Type", "application/json")
	httpRequest.Header.Set("x-client-id", cashfreeService.configuration.CashfreeAppID)
	httpRequest.Header.Set("x-client-secret", cashfreeService.configuration.CashfreeSecretKey)
	httpRequest.Header.Set("x-api-version", cashfreeService.configuration.CashfreeApiVersion)

	httpResponse, requestExecutionError := cashfreeService.httpClient.Do(httpRequest)
	if requestExecutionError != nil {
		return nil, fmt.Errorf("failed to execute request to Cashfree API: %w", requestExecutionError)
	}
	defer httpResponse.Body.Close()

	responseBodyBytes, readingError := io.ReadAll(httpResponse.Body)
	if readingError != nil {
		return nil, fmt.Errorf("failed to read Cashfree response body: %w", readingError)
	}

	if httpResponse.StatusCode < 200 || httpResponse.StatusCode >= 300 {
		return nil, fmt.Errorf("Cashfree API returned error status %d: %s", httpResponse.StatusCode, string(responseBodyBytes))
	}

	var parsedCashfreeResponse struct {
		PaymentSessionID string  `json:"payment_session_id"`
		OrderID          string  `json:"order_id"`
		OrderStatus      string  `json:"order_status"`
		OrderAmount      float64 `json:"order_amount"`
		OrderCurrency    string  `json:"order_currency"`
	}

	deserializationError := json.Unmarshal(responseBodyBytes, &parsedCashfreeResponse)
	if deserializationError != nil {
		return nil, fmt.Errorf("failed to parse Cashfree response: %w", deserializationError)
	}

	// Record payment record in database
	recordError := cashfreeService.teamRepository.RecordPaymentLog(
		requestContext,
		parsedCashfreeResponse.OrderID,
		parsedCashfreeResponse.OrderID,
		teamIdentifier,
		parsedCashfreeResponse.OrderAmount,
		parsedCashfreeResponse.OrderStatus,
		parsedCashfreeResponse.PaymentSessionID,
		"",
		"",
		string(responseBodyBytes),
	)
	if recordError != nil {
		log.Printf("Warning: failed to record payment log: %v", recordError)
	}

	return &models.CashfreeOrderResponse{
		PaymentSessionID: parsedCashfreeResponse.PaymentSessionID,
		OrderID:          parsedCashfreeResponse.OrderID,
		OrderStatus:      parsedCashfreeResponse.OrderStatus,
		OrderAmount:      parsedCashfreeResponse.OrderAmount,
		OrderCurrency:    parsedCashfreeResponse.OrderCurrency,
	}, nil
}

func (cashfreeService *CashfreeService) VerifyPaymentOrder(
	requestContext context.Context,
	orderIdentifier string,
	teamIdentifier string,
) (bool, error) {
	if cashfreeService.configuration.CashfreeAppID == "" || cashfreeService.configuration.CashfreeSecretKey == "" {
		// If credentials are empty in development/test, simulate success
		log.Printf("Sandbox verification simulated for order: %s", orderIdentifier)
		_ = cashfreeService.teamRepository.UpdatePaymentStatus(requestContext, teamIdentifier, "PAID")
		return true, nil
	}

	orderEndpointURL := fmt.Sprintf("%s/orders/%s", cashfreeService.getCashfreeBaseURL(), orderIdentifier)
	httpRequest, requestBuildError := http.NewRequestWithContext(
		requestContext,
		http.MethodGet,
		orderEndpointURL,
		nil,
	)
	if requestBuildError != nil {
		return false, fmt.Errorf("failed to create verification request: %w", requestBuildError)
	}

	httpRequest.Header.Set("x-client-id", cashfreeService.configuration.CashfreeAppID)
	httpRequest.Header.Set("x-client-secret", cashfreeService.configuration.CashfreeSecretKey)
	httpRequest.Header.Set("x-api-version", cashfreeService.configuration.CashfreeApiVersion)

	httpResponse, requestExecutionError := cashfreeService.httpClient.Do(httpRequest)
	if requestExecutionError != nil {
		return false, fmt.Errorf("failed to execute verification request: %w", requestExecutionError)
	}
	defer httpResponse.Body.Close()

	responseBodyBytes, readingError := io.ReadAll(httpResponse.Body)
	if readingError != nil {
		return false, fmt.Errorf("failed to read verification response: %w", readingError)
	}

	if httpResponse.StatusCode != http.StatusOK {
		return false, fmt.Errorf("Cashfree verification returned status %d: %s", httpResponse.StatusCode, string(responseBodyBytes))
	}

	var parsedVerificationResponse struct {
		OrderStatus string  `json:"order_status"`
		OrderAmount float64 `json:"order_amount"`
	}

	jsonError := json.Unmarshal(responseBodyBytes, &parsedVerificationResponse)
	if jsonError != nil {
		return false, fmt.Errorf("failed to parse verification response: %w", jsonError)
	}

	isPaid := strings.ToUpper(parsedVerificationResponse.OrderStatus) == "PAID"
	if isPaid {
		updatePaymentStatusError := cashfreeService.teamRepository.UpdatePaymentStatus(requestContext, teamIdentifier, "PAID")
		if updatePaymentStatusError != nil {
			return false, fmt.Errorf("failed to update team payment status: %w", updatePaymentStatusError)
		}
	}

	return isPaid, nil
}

func (cashfreeService *CashfreeService) VerifyWebhookSignature(
	rawWebhookPayload []byte,
	signature string,
	timestamp string,
) error {
	secretKey := strings.TrimSpace(cashfreeService.configuration.CashfreeSecretKey)
	if secretKey == "" {
		log.Println("[Cashfree] Warning: CASHFREE_SECRET_KEY not set in environment; skipping webhook signature verification in test/sandbox")
		return nil
	}

	trimmedSignature := strings.TrimSpace(signature)
	trimmedTimestamp := strings.TrimSpace(timestamp)

	if trimmedSignature == "" || trimmedTimestamp == "" {
		return errors.New("missing webhook signature or timestamp headers (x-webhook-signature / x-webhook-timestamp)")
	}

	// Cashfree PG signature algorithm: HMAC-SHA256(timestamp + raw_payload, secret_key) -> base64
	messageToSign := trimmedTimestamp + string(rawWebhookPayload)
	mac := hmac.New(sha256.New, []byte(secretKey))
	mac.Write([]byte(messageToSign))
	computedSignature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	if !hmac.Equal([]byte(trimmedSignature), []byte(computedSignature)) {
		return errors.New("invalid cashfree webhook signature: signature mismatch")
	}

	return nil
}

func (cashfreeService *CashfreeService) ProcessWebhook(
	requestContext context.Context,
	rawWebhookPayload []byte,
	signature string,
	timestamp string,
) error {
	// Step 1: Verify webhook signature
	if err := cashfreeService.VerifyWebhookSignature(rawWebhookPayload, signature, timestamp); err != nil {
		return fmt.Errorf("webhook signature verification failed: %w", err)
	}

	// Step 2: Parse Cashfree webhook event payload
	var webhookData struct {
		Data struct {
			Order struct {
				OrderID       string  `json:"order_id"`
				OrderAmount   float64 `json:"order_amount"`
				OrderStatus   string  `json:"order_status"`
				OrderCurrency string  `json:"order_currency"`
			} `json:"order"`
			Payment struct {
				PaymentStatus   string      `json:"payment_status"`
				PaymentTime     string      `json:"payment_time"`
				CfPaymentID     interface{} `json:"cf_payment_id"`
				PaymentAmount   float64     `json:"payment_amount"`
				PaymentCurrency string      `json:"payment_currency"`
				PaymentMessage  string      `json:"payment_message"`
				BankReference   string      `json:"bank_reference"`
			} `json:"payment"`
			CustomerDetails struct {
				CustomerID    string `json:"customer_id"`
				CustomerName  string `json:"customer_name"`
				CustomerEmail string `json:"customer_email"`
				CustomerPhone string `json:"customer_phone"`
			} `json:"customer_details"`
		} `json:"data"`
		EventTime string `json:"event_time"`
		Type      string `json:"type"`
	}

	unmarshalError := json.Unmarshal(rawWebhookPayload, &webhookData)
	if unmarshalError != nil {
		return fmt.Errorf("failed to parse webhook json: %w", unmarshalError)
	}

	orderIdentifier := strings.TrimSpace(webhookData.Data.Order.OrderID)
	teamIdentifier := strings.TrimSpace(webhookData.Data.CustomerDetails.CustomerID)
	orderStatus := strings.ToUpper(strings.TrimSpace(webhookData.Data.Order.OrderStatus))
	paymentStatus := strings.ToUpper(strings.TrimSpace(webhookData.Data.Payment.PaymentStatus))
	eventType := strings.ToUpper(strings.TrimSpace(webhookData.Type))

	// Fallback: Extract teamIdentifier from orderIdentifier (format: order_<teamID>_<timestamp>)
	if teamIdentifier == "" && strings.HasPrefix(orderIdentifier, "order_") {
		parts := strings.Split(orderIdentifier, "_")
		if len(parts) >= 3 {
			teamIdentifier = strings.Join(parts[1:len(parts)-1], "_")
		}
	}

	paymentIdStr := fmt.Sprintf("%v", webhookData.Data.Payment.CfPaymentID)
	orderAmount := webhookData.Data.Order.OrderAmount
	if orderAmount <= 0 {
		orderAmount = webhookData.Data.Payment.PaymentAmount
	}
	if orderAmount <= 0 {
		orderAmount = cashfreeService.configuration.PaymentAmount
	}

	isSuccess := orderStatus == "PAID" || paymentStatus == "SUCCESS" || eventType == "PAYMENT_SUCCESS_WEBHOOK" || eventType == "ORDER_PAID_WEBHOOK"
	isFailed := orderStatus == "FAILED" || paymentStatus == "FAILED" || eventType == "PAYMENT_FAILED_WEBHOOK" || eventType == "PAYMENT_USER_DROPPED_WEBHOOK"

	if isSuccess {
		log.Printf("Cashfree webhook: Payment SUCCESS for team %s (order: %s, payment: %s)", teamIdentifier, orderIdentifier, paymentIdStr)
		if teamIdentifier != "" {
			updateErr := cashfreeService.teamRepository.UpdatePaymentStatus(requestContext, teamIdentifier, "PAID")
			if updateErr != nil {
				log.Printf("Failed to update team payment status to PAID: %v", updateErr)
			}
		}
		_ = cashfreeService.teamRepository.RecordPaymentLog(
			requestContext,
			orderIdentifier,
			orderIdentifier,
			teamIdentifier,
			orderAmount,
			"PAID",
			"",
			paymentIdStr,
			"",
			string(rawWebhookPayload),
		)
	} else if isFailed {
		log.Printf("Cashfree webhook: Payment FAILED for team %s (order: %s)", teamIdentifier, orderIdentifier)
		_ = cashfreeService.teamRepository.RecordPaymentLog(
			requestContext,
			orderIdentifier,
			orderIdentifier,
			teamIdentifier,
			orderAmount,
			"FAILED",
			"",
			paymentIdStr,
			"",
			string(rawWebhookPayload),
		)
	} else {
		log.Printf("Cashfree webhook received event: %s, order: %s, status: %s", eventType, orderIdentifier, orderStatus)
		_ = cashfreeService.teamRepository.RecordPaymentLog(
			requestContext,
			orderIdentifier,
			orderIdentifier,
			teamIdentifier,
			orderAmount,
			orderStatus,
			"",
			paymentIdStr,
			"",
			string(rawWebhookPayload),
		)
	}

	return nil
}

func (cashfreeService *CashfreeService) GetPaymentAmount() float64 {
	return cashfreeService.configuration.PaymentAmount
}

func (cashfreeService *CashfreeService) GetEnvironment() string {
	return cashfreeService.configuration.CashfreeEnvironment
}

func (cashfreeService *CashfreeService) GetApiVersion() string {
	return cashfreeService.configuration.CashfreeApiVersion
}
