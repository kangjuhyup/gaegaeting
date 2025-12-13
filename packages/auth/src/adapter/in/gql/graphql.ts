
/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */

export interface SignupInput {
    username: string;
    email?: Nullable<string>;
    password: string;
    inviteCode?: Nullable<string>;
}

export interface SigninInput {
    usernameOrEmail: string;
    password: string;
    clientId?: Nullable<string>;
}

export interface LinkIdentityInput {
    provider: string;
    authCode?: Nullable<string>;
    redirectUri?: Nullable<string>;
}

export interface AuthPayload {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface User {
    id: string;
    username: string;
    email?: Nullable<string>;
    status: string;
    identities: UserIdentity[];
}

export interface UserIdentity {
    provider: string;
    providerSub: string;
    linkedAt: DateTime;
}

export interface IQuery {
    me(): User | Promise<User>;
    myPermissions(clientId?: Nullable<string>): string[] | Promise<string[]>;
}

export interface IMutation {
    signup(input: SignupInput): Nullable<AuthPayload> | Promise<Nullable<AuthPayload>>;
    signin(input: SigninInput): Nullable<AuthPayload> | Promise<Nullable<AuthPayload>>;
    signout(allDevices?: Nullable<boolean>): boolean | Promise<boolean>;
    refresh(refreshToken: string): Nullable<AuthPayload> | Promise<Nullable<AuthPayload>>;
    linkIdentity(input: LinkIdentityInput): boolean | Promise<boolean>;
    unlinkIdentity(provider: string): boolean | Promise<boolean>;
    kakaoSignin(authCode: string, redirectUri?: Nullable<string>): AuthPayload | Promise<AuthPayload>;
    appleSignin(idToken: string, authorizationCode?: Nullable<string>, user?: Nullable<string>): AuthPayload | Promise<AuthPayload>;
    nativeSignin(provider: string, accessToken: string, refreshToken?: Nullable<string>, expiresIn?: Nullable<number>, tokenType?: Nullable<string>): AuthPayload | Promise<AuthPayload>;
    requestOtp(phoneNumber: string): boolean | Promise<boolean>;
    verifyOtp(phoneNumber: string, code: string): AuthPayload | Promise<AuthPayload>;
}

export interface ISubscription {
    onAuthEvent(): string | Promise<string>;
}

export type DateTime = any;
type Nullable<T> = T | null;
