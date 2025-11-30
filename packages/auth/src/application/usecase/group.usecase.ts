import { Injectable } from '@nestjs/common';

export interface CreateGroupInput {
  tenantId: string;
  code: string;
  name: string;
  parentId?: string;
}

export interface UpdateGroupInput {
  name?: string;
  parentId?: string;
}

export interface GroupDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  parentId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddUserToGroupInput {
  userId: string;
  groupId: string;
}

export interface ListGroupsQuery {
  tenantId?: string;
  parentId?: string;
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export abstract class GroupUsecase {
  abstract createGroup(input: CreateGroupInput): Promise<GroupDto>;
  abstract getGroup(groupId: string): Promise<GroupDto | null>;
  abstract listGroups(query: ListGroupsQuery): Promise<PaginatedResult<GroupDto>>;
  abstract updateGroup(groupId: string, input: UpdateGroupInput): Promise<GroupDto>;
  abstract deleteGroup(groupId: string): Promise<void>;
  
  abstract addUserToGroup(input: AddUserToGroupInput): Promise<void>;
  abstract removeUserFromGroup(userId: string, groupId: string): Promise<void>;
  abstract getGroupUsers(groupId: string): Promise<string[]>; // returns userIds
}

