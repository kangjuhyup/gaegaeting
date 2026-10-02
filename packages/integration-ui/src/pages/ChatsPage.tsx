import { SocialPersonAvatar } from "../components/SocialPersonAvatar.js";
import {
  roomMessages,
  sortRooms,
  socialTime,
  type SocialPerson,
  type PreviewRoom,
  type PreviewMessage,
} from "../lib/social-preview.js";

export function ChatsPage({
  people,
  rooms,
  messages,
  onOpenChat,
  onLikes,
}: {
  people: SocialPerson[];
  rooms: PreviewRoom[];
  messages: PreviewMessage[];
  onOpenChat: (roomId: string) => void;
  onLikes: () => void;
}) {
  return (
    <section className="social-page" aria-labelledby="chats-heading">
      <div className="social-page__heading">
        <p className="social-eyebrow">산책 전에, 가벼운 인사</p>
        <h1 id="chats-heading" tabIndex={-1}>
          채팅
        </h1>
        <p>강아지 이야기를 나누며 조금씩 가까워져요.</p>
      </div>
      {rooms.length === 0 ? (
        <div className="social-empty">
          <span aria-hidden="true">💬</span>
          <h2>아직 시작된 대화가 없어요</h2>
          <p>관심을 보낸 친구들을 먼저 확인해보세요.</p>
          <button className="button button--primary" onClick={onLikes}>
            보낸 관심 보기
          </button>
        </div>
      ) : (
        <ul className="social-chat-list">
          {sortRooms(rooms, messages).map((room) => {
            const person = people.find((item) => item.id === room.personId);
            if (!person) return null;
            const last = roomMessages(messages, room.id).at(-1);
            return (
              <li key={room.id}>
                <button
                  className="social-chat-row"
                  onClick={() => onOpenChat(room.id)}
                  aria-label={`${person.nickname}, ${person.petName}, ${room.unread ? `안 읽은 메시지 ${room.unread}개` : "대화 보기"}`}
                >
                  <SocialPersonAvatar person={person} />
                  <span className="social-chat-row__content">
                    <strong>
                      {person.nickname} <small>{person.petName}</small>
                    </strong>
                    <span>{last?.body ?? "첫 인사를 건네보세요 🐾"}</span>
                  </span>
                  <span className="social-chat-row__meta">
                    {last && (
                      <time dateTime={last.sentAt}>
                        {socialTime(last.sentAt)}
                      </time>
                    )}
                    {room.unread > 0 && (
                      <span className="social-unread">{room.unread}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
