package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"gaegaeting/chat/internal/application/port"
	"gaegaeting/chat/internal/domain/message"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WebSocketHandler struct {
	messageService port.MessageService
	roomService    port.RoomService
	clients        map[string]map[*websocket.Conn]bool
	mu             sync.RWMutex
}

func NewWebSocketHandler(messageService port.MessageService, roomService port.RoomService) *WebSocketHandler {
	return &WebSocketHandler{
		messageService: messageService,
		roomService:    roomService,
		clients:        make(map[string]map[*websocket.Conn]bool),
	}
}

type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	roomID := c.Param("roomId")
	userID, _ := c.Get("userId")

	// Verify room exists and user is a participant
	room, err := h.roomService.GetRoom(c.Request.Context(), roomID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "room not found"})
		return
	}

	if !room.IsParticipant(userID.(string)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "not a room participant"})
		return
	}

	// Upgrade connection
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Register client
	h.registerClient(roomID, conn)
	defer h.unregisterClient(roomID, conn)

	// Handle messages
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}

		var wsMsg WSMessage
		if err := json.Unmarshal(msg, &wsMsg); err != nil {
			log.Printf("Failed to unmarshal message: %v", err)
			continue
		}

		h.handleMessage(c.Request.Context(), roomID, userID.(string), &wsMsg)
	}
}

func (h *WebSocketHandler) handleMessage(ctx context.Context, roomID, userID string, wsMsg *WSMessage) {
	switch wsMsg.Type {
	case "message":
		payload, ok := wsMsg.Payload.(map[string]interface{})
		if !ok {
			return
		}

		content, _ := payload["content"].(string)
		msgType, _ := payload["type"].(string)

		msg, err := h.messageService.SendMessage(ctx, roomID, userID, content, message.MessageType(msgType))
		if err != nil {
			log.Printf("Failed to send message: %v", err)
			return
		}

		// Broadcast to all clients in the room
		h.broadcast(roomID, WSMessage{
			Type:    "message",
			Payload: msg,
		})

	case "typing":
		// Broadcast typing indicator
		h.broadcast(roomID, WSMessage{
			Type: "typing",
			Payload: map[string]string{
				"userId": userID,
			},
		})

	case "read":
		payload, ok := wsMsg.Payload.(map[string]interface{})
		if !ok {
			return
		}

		messageID, _ := payload["messageId"].(string)
		if err := h.messageService.MarkAsRead(ctx, messageID, userID); err != nil {
			log.Printf("Failed to mark message as read: %v", err)
			return
		}

		h.broadcast(roomID, WSMessage{
			Type: "read",
			Payload: map[string]string{
				"messageId": messageID,
				"userId":    userID,
			},
		})
	}
}

func (h *WebSocketHandler) registerClient(roomID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.clients[roomID] == nil {
		h.clients[roomID] = make(map[*websocket.Conn]bool)
	}
	h.clients[roomID][conn] = true
}

func (h *WebSocketHandler) unregisterClient(roomID string, conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if clients, ok := h.clients[roomID]; ok {
		delete(clients, conn)
		if len(clients) == 0 {
			delete(h.clients, roomID)
		}
	}
	conn.Close()
}

func (h *WebSocketHandler) broadcast(roomID string, msg WSMessage) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients, ok := h.clients[roomID]
	if !ok {
		return
	}

	data, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal broadcast message: %v", err)
		return
	}

	for conn := range clients {
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			log.Printf("Failed to send message to client: %v", err)
			conn.Close()
			delete(clients, conn)
		}
	}
}
