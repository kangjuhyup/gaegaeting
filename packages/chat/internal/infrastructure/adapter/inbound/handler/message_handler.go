package handler

import (
	"net/http"
	"strconv"

	"gaegaeting/chat/internal/application/port"
	"gaegaeting/chat/internal/domain/message"

	"github.com/gin-gonic/gin"
)

type MessageHandler struct {
	service port.MessageService
}

func NewMessageHandler(service port.MessageService) *MessageHandler {
	return &MessageHandler{service: service}
}

type SendMessageRequest struct {
	RoomID   string `json:"roomId" binding:"required"`
	SenderID string `json:"senderId" binding:"required"`
	Content  string `json:"content" binding:"required"`
	Type     string `json:"type" binding:"required"`
}

func (h *MessageHandler) SendMessage(c *gin.Context) {
	var req SendMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	msg, err := h.service.SendMessage(
		c.Request.Context(),
		req.RoomID,
		req.SenderID,
		req.Content,
		message.MessageType(req.Type),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, msg)
}

func (h *MessageHandler) GetMessages(c *gin.Context) {
	roomID := c.Param("roomId")
	
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	messages, err := h.service.GetMessages(c.Request.Context(), roomID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, messages)
}

func (h *MessageHandler) MarkAsRead(c *gin.Context) {
	messageID := c.Param("messageId")
	userID, _ := c.Get("userId")

	err := h.service.MarkAsRead(c.Request.Context(), messageID, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "message marked as read"})
}

func (h *MessageHandler) GetUnreadCount(c *gin.Context) {
	roomID := c.Param("roomId")
	userID, _ := c.Get("userId")

	count, err := h.service.GetUnreadCount(c.Request.Context(), roomID, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}
