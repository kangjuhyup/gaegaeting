import { Fragment, useEffect, useRef, useState } from "react";
import { SocialPersonAvatar } from "../components/SocialPersonAvatar.js";
import { breeds, petLabel } from "../lib/pet-options.js";
import {
  messageText,
  socialDate,
  socialTime,
  type SocialPerson,
  type PreviewMessage,
} from "../lib/social-preview.js";

export function ChatPage({
  person,
  messages,
  onBack,
  onSend,
}: {
  person: SocialPerson;
  messages: PreviewMessage[];
  onBack: () => void;
  onSend: (body: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const end = useRef<HTMLLIElement>(null);
  const composing = useRef(false);
  const previousCount = useRef(messages.length);
  useEffect(() => {
    if (messages.length > previousCount.current)
      end.current?.scrollIntoView({ block: "nearest" });
    previousCount.current = messages.length;
  }, [messages.length]);
  function send() {
    const body = messageText(draft);
    if (!body || composing.current) return;
    onSend(body);
    setDraft("");
    setAnnouncement(
      "샘플 메시지를 화면에 추가했어요. 서버에는 저장되지 않아요.",
    );
  }
  return (
    <section
      className="social-conversation"
      aria-labelledby="conversation-heading"
    >
      <header className="social-conversation__header">
        <button
          type="button"
          className="social-back"
          onClick={onBack}
          aria-label="채팅 목록으로 돌아가기"
        >
          ‹
        </button>
        <SocialPersonAvatar person={person} small />
        <div>
          <h1 id="conversation-heading" tabIndex={-1}>
            {person.nickname}
          </h1>
          <p>{person.petName}와 함께하는 산책</p>
        </div>
      </header>
      <div className="social-conversation__pet">
        <span aria-hidden="true">🐾</span>
        <strong>{person.petName}</strong>
        <span>
          {petLabel(breeds, person.breed)} · {person.age}살 · {person.area}
        </span>
      </div>
      <ol
        className="social-messages"
        aria-label={`${person.nickname}와의 샘플 대화`}
      >
        {messages.length === 0 && (
          <li className="social-first-message">
            가벼운 인사로 대화를 시작해보세요 🐾
          </li>
        )}
        {messages.map((message, index) => {
          const showDate =
            !index ||
            socialDate(message.sentAt) !==
              socialDate(messages[index - 1].sentAt);
          return (
            <Fragment key={message.id}>
              {showDate && (
                <li className="social-message-date">
                  <span>{socialDate(message.sentAt)}</span>
                </li>
              )}
              <li
                className={`social-message ${message.sender === "me" ? "social-message--mine" : ""}`}
              >
                {message.sender === "other" && (
                  <SocialPersonAvatar person={person} small />
                )}
                <div className="social-message__body">
                  <span className="sr-only">
                    {message.sender === "me" ? "나" : person.nickname}:{" "}
                  </span>
                  <p>{message.body}</p>
                  <time dateTime={message.sentAt}>
                    {socialTime(message.sentAt)}
                  </time>
                </div>
              </li>
            </Fragment>
          );
        })}
        <li className="social-scroll-anchor" ref={end} aria-hidden="true" />
      </ol>
      <form
        className="social-composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <label className="sr-only" htmlFor="chat-message">
          샘플 메시지
        </label>
        <textarea
          id="chat-message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={1}
          maxLength={2000}
          placeholder="산책 친구에게 인사를 건네보세요"
          aria-describedby="chat-preview-note"
          onCompositionStart={() => {
            composing.current = true;
          }}
          onCompositionEnd={() => {
            composing.current = false;
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              event.keyCode !== 229 &&
              !composing.current
            ) {
              event.preventDefault();
              send();
            }
          }}
        />
        <button
          type="submit"
          disabled={!messageText(draft)}
          aria-label="샘플 메시지 보내기"
        >
          ↑
        </button>
        <p id="chat-preview-note">
          미리보기 대화예요. 메시지는 서버에 저장되지 않아요.
        </p>
        <span className="sr-only" role="status">
          {announcement}
        </span>
      </form>
    </section>
  );
}
