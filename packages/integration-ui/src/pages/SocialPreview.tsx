import { useEffect, useState } from "react";
import {
  samplePeople,
  sampleRooms,
  sampleMessages,
  roomMessages,
  type PreviewMessage,
} from "../lib/social-preview.js";
import { LikesPage } from "./LikesPage.js";
import { ChatsPage } from "./ChatsPage.js";
import { ChatPage } from "./ChatPage.js";

export function SocialPreview({
  route,
  roomId,
  onOpenChat,
  onChats,
  onLikes,
  onRecommendations,
}: {
  route: "likes" | "chats";
  roomId?: string;
  onOpenChat: (roomId: string) => void;
  onChats: () => void;
  onLikes: () => void;
  onRecommendations: () => void;
}) {
  const [rooms, setRooms] = useState(sampleRooms);
  const [messages, setMessages] = useState(sampleMessages);
  useEffect(() => {
    if (route === "chats" && roomId)
      setRooms((current) =>
        current.map((room) =>
          room.id === roomId ? { ...room, unread: 0 } : room,
        ),
      );
  }, [roomId, route]);
  const room = rooms.find((item) => item.id === roomId);
  const person = samplePeople.find((item) => item.id === room?.personId);
  function send(body: string) {
    if (!room) return;
    const message: PreviewMessage = {
      id: `preview-${crypto.randomUUID()}`,
      roomId: room.id,
      sender: "me",
      body,
      sentAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, message]);
  }
  return (
    <div className="social-preview">
      <aside className="social-preview-note">
        <span>샘플 미리보기</span>
        <p>실제 관심 목록과 채팅은 서비스 연동 후 표시돼요.</p>
      </aside>
      {route === "likes" ? (
        <LikesPage
          people={samplePeople}
          rooms={rooms}
          onOpenChat={onOpenChat}
          onRecommendations={onRecommendations}
        />
      ) : !roomId ? (
        <ChatsPage
          people={samplePeople}
          rooms={rooms}
          messages={messages}
          onOpenChat={onOpenChat}
          onLikes={onLikes}
        />
      ) : room && person ? (
        <ChatPage
          key={room.id}
          person={person}
          messages={roomMessages(messages, room.id)}
          onBack={onChats}
          onSend={send}
        />
      ) : (
        <section className="social-empty">
          <h1 tabIndex={-1}>이 대화 예시를 찾을 수 없어요</h1>
          <button className="button button--primary" onClick={onChats}>
            채팅 목록으로
          </button>
        </section>
      )}
    </div>
  );
}
