package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"auth/internal/model"
	"auth/internal/service"
)

type InternalHandler struct {
	service service.AuthService
}

func NewInternalHandler(service service.AuthService) *InternalHandler {
	return &InternalHandler{service: service}
}

func (h *InternalHandler) SetUserMapping(c *gin.Context) {
	userID := c.Param("userId")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "userId is required"})
		return
	}

	var req model.SetUserMappingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.service.SetUserMapping(c.Request.Context(), userID, req.ProviderType, req.ProviderID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user mapping updated successfully"})
}

func (h *InternalHandler) GetUser(c *gin.Context) {
	providerType := c.Query("providerType")
	providerID := c.Query("providerId")

	if providerType == "" || providerID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "providerType and providerId are required"})
		return
	}

	providerTypeInt, err := strconv.Atoi(providerType)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid providerType"})
		return
	}

	authProvider, err := h.service.GetAuthProvider(c.Request.Context(), providerTypeInt, providerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if authProvider == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, authProvider)
}
