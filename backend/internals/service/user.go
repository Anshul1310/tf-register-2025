package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/Anshul1310/tf-register/internals/models"
	"github.com/Anshul1310/tf-register/internals/repository"
	"github.com/google/uuid"
)

type UserService struct {
	userRepository *repository.UserRepository
	teamRepository *repository.TeamRepository
}

func NewUserService(
	userRepository *repository.UserRepository,
	teamRepository *repository.TeamRepository,
) *UserService {
	return &UserService{
		userRepository: userRepository,
		teamRepository: teamRepository,
	}
}

func (userService *UserService) GetUserProfile(requestContext context.Context, targetUserID uuid.UUID) (*models.User, error) {
	userRecord, findUserError := userService.userRepository.FindUserByID(requestContext, targetUserID)
	if findUserError != nil {
		return nil, fmt.Errorf("failed to retrieve user profile: %w", findUserError)
	}

	if userRecord == nil {
		return nil, errors.New("user not found")
	}

	return userRecord, nil
}

func (userService *UserService) SyncUser(requestContext context.Context, syncRequest models.SyncUserRequest) (*models.User, error) {
	if syncRequest.UserID == uuid.Nil {
		return nil, errors.New("user id cannot be empty")
	}

	userModelToSave := &models.User{
		UserID: syncRequest.UserID,
		Email:  syncRequest.Email,
		Name:   syncRequest.Name,
		Pfp:    &syncRequest.Pfp,
	}

	savedUserRecord, upsertError := userService.userRepository.UpsertUser(requestContext, userModelToSave)
	if upsertError != nil {
		return nil, fmt.Errorf("failed to sync user: %w", upsertError)
	}

	return savedUserRecord, nil
}

func (userService *UserService) UpdateProfile(
	requestContext context.Context,
	targetUserID uuid.UUID,
	profileUpdateRequest models.UpdateUserProfileRequest,
) (*models.User, error) {
	existingUserRecord, findUserError := userService.userRepository.FindUserByID(requestContext, targetUserID)
	if findUserError != nil {
		return nil, fmt.Errorf("failed to find existing user: %w", findUserError)
	}

	if existingUserRecord == nil {
		return nil, errors.New("user not found")
	}

	userProfileToUpdate := &models.User{
		UserID:     targetUserID,
		Name:       profileUpdateRequest.Name,
		RollNumber: &profileUpdateRequest.RollNumber,
		Hostel:     &profileUpdateRequest.Hostel,
		Mess:       &profileUpdateRequest.Mess,
		Gender:     &profileUpdateRequest.Gender,
	}

	if profileUpdateRequest.Email != nil && *profileUpdateRequest.Email != "" {
		userProfileToUpdate.Email = *profileUpdateRequest.Email
	} else {
		userProfileToUpdate.Email = existingUserRecord.Email
	}

	updatedUserRecord, updateError := userService.userRepository.UpdateUserProfile(requestContext, userProfileToUpdate)
	if updateError != nil {
		return nil, fmt.Errorf("failed to update user profile: %w", updateError)
	}

	return updatedUserRecord, nil
}

func (userService *UserService) LeaveTeam(requestContext context.Context, targetUserID uuid.UUID) error {
	userRecord, findUserError := userService.userRepository.FindUserByID(requestContext, targetUserID)
	if findUserError != nil {
		return fmt.Errorf("failed to find user: %w", findUserError)
	}

	if userRecord == nil {
		return errors.New("user not found")
	}

	if userRecord.TeamID == nil || *userRecord.TeamID == "" {
		return errors.New("user is not currently in any team")
	}

	// Check if user is the leader of the team
	teamRecord, findTeamError := userService.teamRepository.FindTeamByID(requestContext, *userRecord.TeamID)
	if findTeamError == nil && teamRecord != nil {
		if teamRecord.LeaderUserID == targetUserID {
			return errors.New("team leader cannot leave the team; delete the team instead")
		}
	}

	updateError := userService.userRepository.UpdateUserTeam(requestContext, targetUserID, nil)
	if updateError != nil {
		return fmt.Errorf("failed to remove user from team: %w", updateError)
	}

	return nil
}
