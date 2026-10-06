import { createClient } from "graphql-ws";
export type ChatMessage = {
  id: number; roomId: number; senderId: string; body: string;
  clientMessageId: string | null; sentAt: string;
};
export type ChatRoom = {
  id: number; pairId: number | null; otherUserId: string; createdAt: string;
  lastMessage: ChatMessage | null; unread: number;
  lastReadMessageId: number; otherLastReadMessageId: number;
};
export type MessagePage = { messages: ChatMessage[]; hasMore: boolean };

export type ChatEvent = { roomId: number | null; kind: "ROOM" | "MESSAGE" | "READ" | "RESYNC"; messageId: number | null };
const messageFields = "id roomId senderId body clientMessageId sentAt";
const roomFields = `id pairId otherUserId createdAt unread lastReadMessageId otherLastReadMessageId lastMessage { ${messageFields} }`;
export function chatWebsocketUrl(gatewayUrl: string) {
  const url = new URL(gatewayUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.search = ""; url.hash = "";
  return url.toString();
}
export function createChatApi(endpoint: string, token: string, signal?: AbortSignal) {
  async function execute<T>(query: string, variables: Record<string, unknown>, field: string): Promise<T> {
    const response = await fetch(endpoint, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }), cache: "no-store", signal,
    });
    const body = await response.json() as { data?: Record<string, T>; errors?: Array<{ message: string }> };
    if (response.status === 401) throw new Error("로그인이 만료되었습니다. 다시 로그인해 주세요.");
    if (!response.ok || body.errors?.length || !body.data || body.data[field] === undefined) {
      throw new Error(body.errors?.[0]?.message ?? "채팅 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    }
    return body.data[field];
  }
  return {
    rooms: () => execute<ChatRoom[]>(`query ChatRooms { chatRooms { ${roomFields} } }`, {}, "chatRooms"),
    syncRooms: () => execute<ChatRoom[]>(`mutation SyncChatRooms { syncChatRooms { ${roomFields} } }`, {}, "syncChatRooms"),
    room: (roomId: number) => execute<ChatRoom>(`query ChatRoom($roomId: Int!) { chatRoom(roomId: $roomId) { ${roomFields} } }`, { roomId }, "chatRoom"),
    messages: (roomId: number, cursor: { limit: number; before?: number; after?: number }) => execute<MessagePage>(
      `query ChatMessages($roomId: Int!, $cursor: ChatMessageCursorInput) { chatMessages(roomId: $roomId, cursor: $cursor) { messages { ${messageFields} } hasMore } }`, { roomId, cursor }, "chatMessages"),
    send: (roomId: number, input: { body: string; clientMessageId: string }) => execute<ChatMessage>(
      `mutation SendChatMessage($input: SendChatMessageInput!) { sendChatMessage(input: $input) { ${messageFields} } }`, { input: { roomId, ...input } }, "sendChatMessage"),
    read: (roomId: number, messageId: number) => execute<boolean>(
      "mutation MarkChatRead($roomId: Int!, $messageId: Int!) { markChatRead(roomId: $roomId, messageId: $messageId) }", { roomId, messageId }, "markChatRead"),
  };
}
export function subscribeChatEvents(gatewayUrl: string, token: string, roomId: number | undefined,
  onEvent: (event: ChatEvent) => void, onStatus: (status: "connected" | "reconnecting") => void,
  onError: () => void) {
  const client = createClient({ url: chatWebsocketUrl(gatewayUrl),
    connectionParams: { authorization: `Bearer ${token}` }, keepAlive: 15000,
    retryAttempts: Infinity, connectionAckWaitTimeout: 10000,
    on: { connected: () => onStatus("connected"), closed: () => onStatus("reconnecting") },
  });
  const unsubscribe = client.subscribe<{ chatEvents: ChatEvent }>({
    query: "subscription ChatEvents($roomId: Int) { chatEvents(roomId: $roomId) { roomId kind messageId } }",
    variables: { roomId: roomId ?? null },
  }, { next: result => { if (result.data?.chatEvents) onEvent(result.data.chatEvents); else if (result.errors) onError(); },
    error: onError, complete: () => {} });
  return () => { unsubscribe(); void client.dispose(); };
}
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[], roomId: number) {
  const messages = new Map<number, ChatMessage>();
  for (const message of [...current, ...incoming]) {
    if (message.roomId === roomId) messages.set(message.id, message);
  }
  return [...messages.values()].sort((a, b) => a.id - b.id);
}
export function messageAttempt(body: string, previous?: { body: string; clientMessageId: string }) {
  const text = body.trim();
  if (!text || text.length > 2000) throw new Error("메시지는 1~2000자로 입력해 주세요.");
  return previous?.body === text ? previous : { body: text, clientMessageId: crypto.randomUUID() };
}
