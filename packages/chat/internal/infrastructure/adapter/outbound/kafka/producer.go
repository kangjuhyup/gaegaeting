package kafka

import (
	"context"
	"encoding/json"
	"fmt"

	"gaegaeting/chat/internal/domain/message"
	"gaegaeting/chat/internal/domain/room"
	"gaegaeting/chat/internal/infrastructure/config"

	"github.com/segmentio/kafka-go"
)

const (
	TopicMessageCreated = "chat.message.created"
	TopicMessageRead    = "chat.message.read"
	TopicRoomCreated    = "chat.room.created"
)

type Producer struct {
	writer *kafka.Writer
}

func NewProducer(cfg config.KafkaConfig) *Producer {
	writer := &kafka.Writer{
		Addr:     kafka.TCP(cfg.Brokers...),
		Balancer: &kafka.LeastBytes{},
	}

	return &Producer{writer: writer}
}

func (p *Producer) PublishMessageCreated(ctx context.Context, msg *message.Message) error {
	return p.publish(ctx, TopicMessageCreated, msg.ID, msg)
}

func (p *Producer) PublishMessageRead(ctx context.Context, messageID, userID string) error {
	payload := map[string]string{
		"messageId": messageID,
		"userId":    userID,
	}
	return p.publish(ctx, TopicMessageRead, messageID, payload)
}

func (p *Producer) PublishRoomCreated(ctx context.Context, r *room.Room) error {
	return p.publish(ctx, TopicRoomCreated, r.ID, r)
}

func (p *Producer) publish(ctx context.Context, topic, key string, value interface{}) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	err = p.writer.WriteMessages(ctx, kafka.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: data,
	})
	if err != nil {
		return fmt.Errorf("failed to write message to kafka: %w", err)
	}

	return nil
}

func (p *Producer) Close() error {
	return p.writer.Close()
}
