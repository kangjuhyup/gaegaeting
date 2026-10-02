export type AppConfig = {
  issuer: string;
  clientId: string;
  gatewayUrl: string;
  accountUrl: string;
  redirectUri: string;
  postLogoutRedirectUri?: string;
};
export type ApiResult<T> = { data?: T; errors?: Array<{ message: string }> };
export type ProfileImage = {
  kind: "USER" | "PET";
  targetId: string;
  imageNo: number;
  status: "UPLOADING" | "PENDING" | "APPROVED" | "REJECTED";
  url?: string;
  updatedAt: string;
};
