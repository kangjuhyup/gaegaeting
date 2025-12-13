
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

export interface CreateUserInput {
    name: string;
    email?: Nullable<string>;
    password?: Nullable<string>;
    nickname: string;
    gender: UserGender;
    birthDate: DateTime;
    region: UserRegion;
    bio?: Nullable<string>;
    phoneNumber?: Nullable<string>;
}

export interface UpdateUserInput {
    nickname?: Nullable<string>;
    gender?: Nullable<UserGender>;
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
    createProfile(input: CreateUserInput): User | Promise<User>;
    updateProfile(id: string, input: UpdateUserInput): User | Promise<User>;
    generatePresignedUrl(imageNo: number): PresignedUrl | Promise<PresignedUrl>;
    deleteProfileImage(imageNo: number): boolean | Promise<boolean>;
}

export type DateTime = any;
type Nullable<T> = T | null;
