import { MemberEntity } from "../model/member";
import { RoomEntity } from "../model/room";

export abstract class RoomRepositoryPort {
  abstract insertRoom(room: RoomEntity): Promise<RoomEntity>;
  abstract selectRoomFromId(id: number): Promise<RoomEntity | null>;
  abstract selectRoomFromIdWithMembers(id: number): Promise<RoomEntity | null>;
  abstract selectRoomFromDirectKey(directKey: string): Promise<RoomEntity | null>;
  abstract selectRoomFromPairId(pairId: number): Promise<RoomEntity | null>;
  abstract selectRoomsFromUserId(userId: string): Promise<RoomEntity[]>;
  abstract insertMembers(roomId: number, members: MemberEntity[]): Promise<void>;
  abstract selectMemberFromRoomAndUser(roomId: number, userId: string): Promise<MemberEntity | null>;
  abstract updateMember(member: MemberEntity): Promise<void>;
  abstract updateRoomLastMessage(roomId: number, messageId: number): Promise<void>;
}