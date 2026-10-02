export type SocialPerson = {
  id: string;
  nickname: string;
  area: string;
  petName: string;
  breed: string;
  age: number;
  likedAt: string;
};

export type PreviewMessage = {
  id: string;
  roomId: string;
  sender: "me" | "other";
  body: string;
  sentAt: string;
};

export type PreviewRoom = {
  id: string;
  personId: string;
  unread: number;
};

// Presentation-only IDs. Auth subjects and Account IDs never belong in fixtures.
export const samplePeople: SocialPerson[] = [
  {
    id: "sample-1",
    nickname: "종로산책0001",
    area: "서울 종로구",
    petName: "테스트멍0001",
    breed: "MALTESE",
    age: 2,
    likedAt: "2026-10-02T04:25:00Z",
  },
  {
    id: "sample-2",
    nickname: "종로산책0002",
    area: "서울 종로구",
    petName: "테스트멍0002",
    breed: "POODLE",
    age: 3,
    likedAt: "2026-10-02T04:24:00Z",
  },
  {
    id: "sample-3",
    nickname: "종로산책0003",
    area: "서울 종로구",
    petName: "테스트멍0003",
    breed: "CHIHUAHUA",
    age: 4,
    likedAt: "2026-10-02T04:23:00Z",
  },
  {
    id: "sample-4",
    nickname: "종로산책0004",
    area: "서울 종로구",
    petName: "테스트멍0004",
    breed: "POMERANIAN",
    age: 5,
    likedAt: "2026-10-02T04:22:00Z",
  },
  {
    id: "sample-5",
    nickname: "종로산책0005",
    area: "서울 종로구",
    petName: "테스트멍0005",
    breed: "SHIH_TZU",
    age: 6,
    likedAt: "2026-10-02T04:21:00Z",
  },
];

export const sampleRooms: PreviewRoom[] = [
  { id: "sample-chat-1", personId: "sample-1", unread: 2 },
  { id: "sample-chat-2", personId: "sample-2", unread: 0 },
  { id: "sample-chat-3", personId: "sample-3", unread: 1 },
];

export const sampleMessages: PreviewMessage[] = sampleRooms.flatMap(
  (room, i) => {
    const lines = [
      "안녕하세요! 강아지와 같이 산책하면 좋겠어요 🐾",
      "좋아요! 평소에 어느 시간에 산책하세요?",
      "저녁에 공원으로 나가는 편이에요.",
      [
        "이번 주말에 가볍게 걸어볼까요?",
        "네, 만나기 전에 여기서 이야기해요 😊",
        "강아지가 새로운 친구를 만나면 좋아할 것 같아요!",
      ][i],
    ];
    return lines.map((body, j) => ({
      id: `${room.id}-message-${j + 1}`,
      roomId: room.id,
      sender: (j === 1 || (i === 1 && j === 3) ? "me" : "other") as
        | "me"
        | "other",
      body,
      sentAt: new Date(Date.UTC(2026, 9, 2, 3 - i, 10 + j * 3)).toISOString(),
    }));
  },
);

export function roomMessages(messages: PreviewMessage[], roomId: string) {
  return messages.filter((message) => message.roomId === roomId);
}

export function sortRooms(rooms: PreviewRoom[], messages: PreviewMessage[]) {
  return [...rooms].sort((a, b) => {
    const time = (room: PreviewRoom) =>
      roomMessages(messages, room.id).at(-1)?.sentAt ?? "";
    return time(b).localeCompare(time(a));
  });
}

export function messageText(value: string): string | undefined {
  const body = value.trim();
  return body.length > 0 && body.length <= 2000 ? body : undefined;
}

export function socialTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function socialDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));
}
