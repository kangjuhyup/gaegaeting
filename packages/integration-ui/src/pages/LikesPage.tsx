import { useState } from "react";
import { SocialPersonAvatar } from "../components/SocialPersonAvatar.js";
import { breeds, petLabel } from "../lib/pet-options.js";
import {
  socialDate,
  type SocialPerson,
  type PreviewRoom,
} from "../lib/social-preview.js";

export function LikesPage({
  people,
  rooms,
  onOpenChat,
  onRecommendations,
}: {
  people: SocialPerson[];
  rooms: PreviewRoom[];
  onOpenChat: (roomId: string) => void;
  onRecommendations: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "conversation">("all");
  const shown = people.filter(
    (person) =>
      filter === "all" || rooms.some((room) => room.personId === person.id),
  );
  return (
    <section className="social-page" aria-labelledby="likes-heading">
      <div className="social-page__heading">
        <p className="social-eyebrow">마음이 닿는 산책</p>
        <h1 id="likes-heading" tabIndex={-1}>
          보낸 관심 <span>{people.length}</span>
        </h1>
        <p>마음에 들었던 산책 친구들을 다시 만나보세요.</p>
      </div>
      <div className="social-filters" aria-label="관심 목록 필터">
        <button
          type="button"
          aria-pressed={filter === "all"}
          onClick={() => setFilter("all")}
        >
          전체 {people.length}
        </button>
        <button
          type="button"
          aria-pressed={filter === "conversation"}
          onClick={() => setFilter("conversation")}
        >
          대화 예시 {rooms.length}
        </button>
      </div>
      {shown.length === 0 ? (
        <div className="social-empty">
          <span aria-hidden="true">♡</span>
          <h2>아직 보낸 관심이 없어요</h2>
          <p>함께 걷고 싶은 친구에게 마음을 표현해보세요.</p>
          <button
            className="button button--primary"
            onClick={onRecommendations}
          >
            추천 친구 만나기
          </button>
        </div>
      ) : (
        <ul className="social-likes">
          {shown.map((person) => {
            const room = rooms.find((item) => item.personId === person.id);
            return (
              <li className="social-like" key={person.id}>
                <div className="social-like__identity">
                  <SocialPersonAvatar person={person} />
                  <div>
                    <h2>{person.nickname}</h2>
                    <p>
                      {person.area} · {person.petName}와 산책해요
                    </p>
                  </div>
                  <span className="social-heart" aria-label="관심 보냄">
                    ♥
                  </span>
                </div>
                <div className="social-pet-summary">
                  <strong>{person.petName}</strong>
                  <span>
                    {petLabel(breeds, person.breed)} · {person.age}살
                  </span>
                </div>
                <div className="social-like__footer">
                  <span>{socialDate(person.likedAt)} 관심 보냄</span>
                  {room ? (
                    <button
                      className="social-chat-link"
                      onClick={() => onOpenChat(room.id)}
                    >
                      대화 예시 보기 <span aria-hidden="true">↗</span>
                    </button>
                  ) : (
                    <span className="social-status">관심 보냄 ♡</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
