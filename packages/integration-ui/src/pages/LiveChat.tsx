import { Fragment, useEffect, useRef, useState } from "react";
import { errorMessage } from "@gaegaeting/ui-common";
import type { AppConfig } from "../types.js";
import { createChatApi, subscribeChatEvents, mergeMessages, messageAttempt, type ChatRoom, type ChatMessage, type MessagePage } from "../lib/chat-api.js";
import { loadRecommendationDetails, type RecommendationDetails } from "../lib/recommendation-details.js";
import { socialDate, socialTime, messageText } from "../lib/social-preview.js";

type Props = { config: AppConfig; token: string; roomId?: string;
  onOpenChat: (id: string) => void; onChats: () => void; onRecommendations: () => void };

export function LiveChat({ config, token, roomId, onOpenChat, onChats, onRecommendations }: Props) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [room, setRoom] = useState<ChatRoom>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [details, setDetails] = useState<Record<string, RecommendationDetails>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const pendingSend = useRef<{ body: string; clientMessageId: string }>();
  const sendingNow = useRef(false);
  const composing = useRef(false);
  const end = useRef<HTMLLIElement>(null);
  const newest = useRef(0);
  const alive = useRef(true);
  const pendingController = useRef<AbortController>();
  const isVisible = () => document.visibilityState !== "hidden";

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; pendingController.current?.abort(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const api = createChatApi(config.gatewayUrl, token, controller.signal);
    let active = true;
    let running = false;
    let requested = false;
    async function loadDetails(userIds: string[]) {
      try {
        const value = await loadRecommendationDetails(config.gatewayUrl, userIds, token);
        if (active) setDetails(value);
      } catch { /* Recommendation metadata does not block the conversation. */ }
    }
    async function syncInitialRooms() {
      if (roomId) return;
      try { await api.syncRooms(); }
      catch (cause) { if (active) setNotice(errorMessage(cause)); }
    }
    async function loadRooms() {
      const next = await api.rooms();
      if (!active) return;
      setRooms(next);
      if (next.length) void loadDetails(next.map(item => item.otherUserId));
    }
    async function loadMessages(id: number, nextRoom: ChatRoom) {
      const initial = newest.current === 0;
      let page: MessagePage;
      do {
        page = await api.messages(id, { limit: 50, ...(newest.current ? { after: newest.current } : {}) });
        if (!active) return;
        setMessages(current => mergeMessages(current, page.messages, id));
        if (initial) setHasOlder(page.hasMore);
        newest.current = Math.max(newest.current, ...page.messages.map(message => message.id));
      } while (!initial && page.hasMore && page.messages.length);
      if (newest.current > nextRoom.lastReadMessageId && isVisible()) await api.read(id, newest.current);
    }
    async function loadRoom(first: boolean) {
      const id = Number(roomId);
      if (!Number.isInteger(id) || id < 1) throw new Error("대화를 찾을 수 없습니다.");
      const nextRoom = await api.room(id);
      if (!active) return;
      setRoom(nextRoom);
      if (first) void loadDetails([nextRoom.otherUserId]);
      await loadMessages(id, nextRoom);
    }
    async function load(first = false) {
      if (running) { requested = true; return; }
      running = true;
      try {
        if (first) await syncInitialRooms();
        do {
          requested = false;
          if (roomId) await loadRoom(first);
          else await loadRooms();
        } while (requested && active);
        if (active) { setLoading(false); setError(""); }
      } catch (cause) {
        if (active) { setError(errorMessage(cause)); setLoading(false); }
      } finally { running = false; }
    }
    const refresh = () => { if (active && isVisible()) void load(); };
    void load(true);
    const unsubscribe = subscribeChatEvents(config.gatewayUrl, token, roomId ? Number(roomId) : undefined,
      () => refresh(), status => {
        if (!active) return;
        if (status === "connected") { setNotice(""); setConnectionError(""); refresh(); }
        else setNotice("실시간 연결을 복구하고 있어요. 연결되면 새 대화를 불러올게요.");
      }, () => { if (active) setConnectionError("실시간 연결을 확인해 주세요. 로그인 상태를 확인하거나 다시 연결해 주세요."); });
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; controller.abort(); unsubscribe(); document.removeEventListener("visibilitychange", refresh); };
  }, [config.gatewayUrl, token, roomId, attempt]);
  const previousCount = useRef(0);
  useEffect(() => {
    if (messages.length > previousCount.current && !loadingOlder) end.current?.scrollIntoView({ block: "nearest" });
    previousCount.current = messages.length;
  }, [messages.length, loadingOlder]);
  async function older() {
    if (!room || loadingOlder || !messages.length) return;
    setLoadingOlder(true);
    try {
      const page = await createChatApi(config.gatewayUrl, token).messages(room.id, { before: messages[0].id, limit: 50 });
      if (!alive.current) return;
      setMessages(current => mergeMessages(current, page.messages, room.id));
      setHasOlder(page.hasMore);
    } catch (cause) { if (alive.current) setError(errorMessage(cause)); }
    finally { if (alive.current) setLoadingOlder(false); }
  }
  async function send() {
    if (!room || sendingNow.current || composing.current || !messageText(draft)) return;
    sendingNow.current = true; setSending(true); setSendError("");
    const outgoing = messageAttempt(draft, pendingSend.current);
    pendingSend.current = outgoing;
    const controller = new AbortController(); pendingController.current = controller;
    try {
      const message = await createChatApi(config.gatewayUrl, token, controller.signal).send(room.id, outgoing);
      if (!alive.current) return;
      setMessages(current => mergeMessages(current, [message], room.id));
      // Do not advance the receive cursor here: peer messages can precede this acknowledgement.
      setDraft(""); pendingSend.current = undefined;
      setNotice("메시지를 보냈어요.");
      // The subscription supplies the next persisted receive cursor; no local append is treated as delivery proof.

    } catch (cause) { if (alive.current) setSendError(errorMessage(cause)); }
    finally { sendingNow.current = false; if (alive.current) setSending(false); }
  }
  function retry() { setLoading(true); setError(""); setConnectionError(""); setNotice(""); setAttempt(value => value + 1); }
  if (loading) return <section className="social-page" role="status"><h1 tabIndex={-1}>채팅</h1><p>대화를 불러오고 있어요.</p></section>;
  if (error && (!roomId || !room)) return <section className="social-empty"><h1 tabIndex={-1}>대화를 불러오지 못했어요</h1><p role="alert">{error}</p><button className="button" onClick={retry}>다시 시도</button>{roomId && <button className="button" onClick={onChats}>채팅 목록으로</button>}</section>;
  if (!roomId) return <section className="social-page" aria-labelledby="chats-heading">
    <div className="social-page__heading"><p className="social-eyebrow">산책 전에, 가벼운 인사</p><h1 id="chats-heading" tabIndex={-1}>채팅</h1><p>서로 관심을 보낸 친구와 이야기를 나눠보세요.</p></div>
    {notice && <p role="status">{notice}</p>}
    {connectionError && <p role="alert">{connectionError} <button className="button" onClick={retry}>다시 연결</button></p>}
    {rooms.length === 0 ? <div className="social-empty"><span aria-hidden="true">💬</span><h2>아직 시작된 대화가 없어요</h2><p>서로 관심을 보내면 대화를 시작할 수 있어요.</p><button className="button button--primary" onClick={onRecommendations}>추천 친구 만나기</button><button className="button" onClick={retry}>새 대화 확인</button></div> : <ul className="social-chat-list">{rooms.map(item => {
      const person = details[item.otherUserId]; const name = person?.nickname ?? "산책 친구";
      return <li key={item.id}><button className="social-chat-row" onClick={() => onOpenChat(String(item.id))} aria-label={`${name}, ${item.unread ? `안 읽은 메시지 ${item.unread}개` : "대화 보기"}`}><span className="social-avatar" aria-hidden="true">🐾</span><span className="social-chat-row__content"><strong>{name} <small>{person?.pets[0]?.name ?? ""}</small></strong><span>{item.lastMessage?.body ?? "첫 인사를 건네보세요 🐾"}</span></span><span className="social-chat-row__meta">{item.lastMessage && <time dateTime={item.lastMessage.sentAt}>{socialTime(item.lastMessage.sentAt)}</time>}{item.unread > 0 && <span className="social-unread">{item.unread}</span>}</span></button></li>;
    })}</ul>}
  </section>;
  if (!room) return null;
  const person = details[room.otherUserId]; const name = person?.nickname ?? "산책 친구";
  return <section className="social-conversation" aria-labelledby="conversation-heading">
    <header className="social-conversation__header"><button type="button" className="social-back" onClick={onChats} aria-label="채팅 목록으로 돌아가기">‹</button><span aria-hidden="true">🐾</span><div><h1 id="conversation-heading" tabIndex={-1}>{name}</h1><p>{person?.pets[0]?.name ? `${person.pets[0].name}와 함께하는 산책` : "함께 걸을 친구와 이야기해보세요"}</p></div></header>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{error} <button className="button" onClick={retry}>다시 연결</button></p>}
    {connectionError && <p role="alert">{connectionError} <button className="button" onClick={retry}>다시 연결</button></p>}
    {hasOlder && <button className="button" disabled={loadingOlder} onClick={() => void older()}>{loadingOlder ? "불러오는 중…" : "이전 대화 보기"}</button>}
    <LiveChatMessages messages={messages} name={name} otherUserId={room.otherUserId}
      otherLastReadMessageId={room.otherLastReadMessageId} end={end} />
    <form className="social-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
      <label className="sr-only" htmlFor="live-chat-message">메시지</label><textarea id="live-chat-message" value={draft} disabled={sending} rows={1} maxLength={2000} placeholder="산책 친구에게 인사를 건네보세요" aria-describedby={sendError ? "chat-send-error" : undefined} onChange={event => setDraft(event.target.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} onKeyDown={event => {
        if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229 && !composing.current) { event.preventDefault(); void send(); }
      }} /><button type="submit" disabled={sending || !messageText(draft)} aria-label={sending ? "메시지 전송 중" : "메시지 보내기"}>{sending ? "…" : "↑"}</button>
      {sendError && <p id="chat-send-error" role="alert">{sendError} 입력한 메시지는 남아 있어요. 다시 보내기를 눌러주세요.</p>}<span className="sr-only" role="status">{notice}</span>
    </form>
  </section>;
}

export function LiveChatMessages({ messages, name, otherUserId, otherLastReadMessageId, end }: {
  messages: ChatMessage[]; name: string; otherUserId: string; otherLastReadMessageId: number;
  end?: React.RefObject<HTMLLIElement>;
}) {
  return (
    <ol className="social-messages" role="log" aria-live="polite" aria-relevant="additions text" aria-label={`${name}와의 대화`}>
      {!messages.length && <li className="social-first-message">가벼운 인사로 대화를 시작해보세요 🐾</li>}
      {messages.map((message, index) => <Fragment key={message.id}>
        {(!index || socialDate(message.sentAt) !== socialDate(messages[index - 1].sentAt)) && <li className="social-message-date"><span>{socialDate(message.sentAt)}</span></li>}
        <li className={`social-message ${message.senderId !== otherUserId ? "social-message--mine" : ""}`}><div className="social-message__body"><span className="sr-only">{message.senderId === otherUserId ? name : "나"}: </span><p>{message.body}</p><time dateTime={message.sentAt}>{socialTime(message.sentAt)}</time>{message.senderId !== otherUserId && message.id <= otherLastReadMessageId && <small className="chat-read">읽음</small>}</div></li>
      </Fragment>)}<li className="social-scroll-anchor" ref={end} aria-hidden="true" />
    </ol>
  );
}
