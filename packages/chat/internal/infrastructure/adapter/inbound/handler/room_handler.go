package handler

import (
	"net/http"

	"gaegaeting/chat/internal/application/port"
	"gaegaeting/chat/internal/domain/room"

	"github.com/gin-gonic/gin"
)

type RoomHandler struct {
	service port.RoomService
}

func NewRoomHandler(service port.RoomService) *RoomHandler {
	return &RoomHandler{service: service}
}

type CreateRoomRequest struct {
	PairID  string `json:"pairId" binding:"required"`
	User1ID string `json:"user1Id" binding:"required"`
	User2ID string `json:"user2Id" binding:"required"`
}

type UpdateRoomStatusRequest struct {
	Status string `json:"status" binding:"required"`
}

func (h *RoomHandler) CreateRoom(c *gin.Context) {
	var req CreateRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	room, err := h.service.CreateRoom(c.Request.Context(), req.PairID, req.User1ID, req.User2ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, room)
}

func (h *RoomHandler) GetRoom(c *gin.Context) {
	roomID := c.Param("roomId")

	room, err := h.service.GetRoom(c.Request.Context(), roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	c.JSON(http.StatusOK, room)
}

func (h *RoomHandler) GetUserRooms(c *gin.Context) {
	userID, _ := c.Get("userId")

	rooms, err := h.service.GetUserRooms(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, rooms)
}

func (h *RoomHandler) UpdateRoomStatus(c *gin.Context) {
	roomID := c.Param("roomId")

	var req UpdateRoomStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.service.UpdateRoomStatus(c.Request.Context(), roomID, room.RoomStatus(req.Status))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "room status updated"})
}
