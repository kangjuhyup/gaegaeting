
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export enum UserGender {
    MALE = "MALE",
    FEMALE = "FEMALE"
}

export enum UserRegion {
    SEOUL = "SEOUL",
    GYEONGGI = "GYEONGGI",
    INCHEON = "INCHEON",
    GANGWON = "GANGWON",
    CHUNGCHEONG = "CHUNGCHEONG",
    JEOLLA = "JEOLLA",
    GYEONGSANG = "GYEONGSANG",
    JEJU = "JEJU"
}

export enum UserStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    SUSPENDED = "SUSPENDED",
    DELETED = "DELETED"
}

export interface CreateUserProfileInput {
    name: string;
    nickname: string;
    gender: UserGender;
    birthDate: DateTime;
    region: UserRegion;
    bio?: Nullable<string>;
}

export interface UpdateUserProfileInput {
    nickname?: Nullable<string>;
    region?: Nullable<UserRegion>;
    bio?: Nullable<string>;
}

export interface User {
    id: string;
    name: string;
    nickname: string;
    email?: Nullable<string>;
    gender: UserGender;
    birthDate: DateTime;
    region: UserRegion;
    bio?: Nullable<string>;
    phoneNumber?: Nullable<string>;
    status: UserStatus;
    profileImages: string[];
    createdAt: DateTime;
    updatedAt: DateTime;
}

export interface PresignedUrl {
    url: string;
    expiresIn: number;
}

export interface IQuery {
    me(): User | Promise<User>;
    user(id: string): Nullable<User> | Promise<Nullable<User>>;
}

export interface IMutation {
    createProfile(input: CreateUserProfileInput): User | Promise<User>;
    updateProfile(id: string, input: UpdateUserProfileInput): User | Promise<User>;
    generatePresignedUrl(imageNo: number): PresignedUrl | Promise<PresignedUrl>;
    deleteProfileImage(imageNo: number): boolean | Promise<boolean>;
}

export type DateTime = any;
type Nullable<T> = T | null;
