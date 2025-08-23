import { MessageRouter, RouteRule, RouteTarget } from '../message-router';
import { EventPublisherPort } from '@app/feed/domain/port/event-publisher.port';
import { KafkaProducerPort } from '@app/feed/domain/port/kafka-producer.port';
import { Topics } from '../../topic';

// 목 객체 클래스
class MockEventPublisher implements EventPublisherPort {
  publishCalls: { topic: string; payload: any }[] = [];
  
  async publish(topic: string, payload: any): Promise<void> {
    this.publishCalls.push({ topic, payload });
  }
}

class MockKafkaProducer implements KafkaProducerPort {
  produceCalls: { topic: string; payload: any }[] = [];
  
  async produce(topic: string, payload: any): Promise<void> {
    this.produceCalls.push({ topic, payload });
  }
}

describe('MessageRouter 단위 테스트', () => {
  let messageRouter: MessageRouter;
  let eventPublisher: MockEventPublisher;
  let kafkaProducer: MockKafkaProducer;
  
  // 테스트 데이터
  const mockPayload = { id: 123, data: 'test-data' };
  
  beforeEach(() => {
    // 모의 객체 생성
    jest.clearAllMocks();
    
    eventPublisher = new MockEventPublisher();
    kafkaProducer = new MockKafkaProducer();
    
    // 라우팅 규칙 설정
    const routing = {
        rules: [
          { match: { prefix: 'match.' }, target: 'event' } as RouteRule,
          { match: { prefix: 'chat.' }, target: 'kafka' } as RouteRule,
          { match: { equals: 'special.topic' }, target: 'kafka' } as RouteRule,
          { match: { regex: /^regex\..*/ }, target: 'event' } as RouteRule,
        ],
        default: 'event' as RouteTarget,
      };
    
    // 직접 의존성 주입
    messageRouter = new MessageRouter(
      routing,
      eventPublisher,
      kafkaProducer
    );
  });
  
  it('match. 접두사를 가진 토픽은 이벤트 퍼블리셔로 라우팅되어야 함', async () => {
    // Given
    const topic = Topics.MATCH_FEED_LIKE_V1;
    
    // When
    await messageRouter.sendMessage(topic, mockPayload);
    
    // Then
    expect(eventPublisher.publishCalls.length).toBe(1);
    expect(eventPublisher.publishCalls[0].topic).toBe(topic);
    expect(eventPublisher.publishCalls[0].payload).toBe(mockPayload);
    expect(kafkaProducer.produceCalls.length).toBe(0);
  });
  
  it('chat. 접두사를 가진 토픽은 카프카 프로듀서로 라우팅되어야 함', async () => {
    // Given
    const topic = Topics.CHAT_ROOM_CREATED_V1;
    
    // When
    await messageRouter.sendMessage(topic, mockPayload);
    
    // Then
    expect(kafkaProducer.produceCalls.length).toBe(1);
    expect(kafkaProducer.produceCalls[0].topic).toBe(topic);
    expect(kafkaProducer.produceCalls[0].payload).toBe(mockPayload);
    expect(eventPublisher.publishCalls.length).toBe(0);
  });
  
  it('정확히 일치하는 토픽은 지정된 타겟으로 라우팅되어야 함', async () => {
    // Given
    const topic = 'special.topic' as Topics;
    
    // When
    await messageRouter.sendMessage(topic, mockPayload);
    
    // Then
    expect(kafkaProducer.produceCalls.length).toBe(1);
    expect(kafkaProducer.produceCalls[0].topic).toBe(topic);
    expect(eventPublisher.publishCalls.length).toBe(0);
  });
  
  it('정규식 패턴과 일치하는 토픽은 지정된 타겟으로 라우팅되어야 함', async () => {
    // Given
    const topic = 'regex.test' as Topics;
    
    // When
    await messageRouter.sendMessage(topic, mockPayload);
    
    // Then
    expect(eventPublisher.publishCalls.length).toBe(1);
    expect(eventPublisher.publishCalls[0].topic).toBe(topic);
    expect(kafkaProducer.produceCalls.length).toBe(0);
  });
  
  it('규칙과 일치하지 않는 토픽은 기본 타겟으로 라우팅되어야 함', async () => {
    // Given
    const topic = 'unknown.topic' as Topics;
    
    // When
    await messageRouter.sendMessage(topic, mockPayload);
    
    // Then
    expect(eventPublisher.publishCalls.length).toBe(1);
    expect(eventPublisher.publishCalls[0].topic).toBe(topic);
    expect(kafkaProducer.produceCalls.length).toBe(0);
  });
});