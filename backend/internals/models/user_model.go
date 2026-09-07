package models

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	UserID     uuid.UUID `json:"user_id" db:"user_id"`
	Name       string    `json:"name" db:"name"`
	Email      string    `json:"email" db:"email"`
	RollNumber *string   `json:"roll_number,omitempty" db:"roll_number"`
	Hostel     *string   `json:"hostel,omitempty" db:"hostel"`
	Mess       *string   `json:"mess,omitempty" db:"mess"`
	Gender     *string   `json:"gender,omitempty" db:"gender"`
	Pfp        *string   `json:"pfp,omitempty" db:"pfp"`
	TeamID     *string   `json:"team_id,omitempty" db:"team_id"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

type SyncUserRequest struct {
	UserID uuid.UUID `json:"user_id"`
	Email  string    `json:"email"`
	Name   string    `json:"name"`
	Pfp    string    `json:"pfp"`
}

type UpdateUserProfileRequest struct {
	Name       string  `json:"name"`
	RollNumber string  `json:"roll_number"`
	Hostel     string  `json:"hostel"`
	Mess       string  `json:"mess"`
	Gender     string  `json:"gender"`
	Email      *string `json:"email,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}
