export type PublicConfig = {
  basePath: string;
  issuer: string;
  tenantCode: string;
  apiAudience: string;
  authOrigin: string;
  clientId: string;
  interactionClientIds?: string[];
  accountUrl: string;
  gatewayUrl: string;
  imageStorageOrigin?: string;
};

declare global {
  interface Window {
    GAEGAETING_CONFIG?: PublicConfig;
  }
}

const developmentIssuer =
  import.meta.env.VITE_OIDC_ISSUER ?? "http://localhost:3010/t/gaegaeting/oidc";
const developmentConfig: PublicConfig = {
  basePath: import.meta.env.BASE_URL.replace(/\/$/, ""),
  imageStorageOrigin: import.meta.env.VITE_IMAGE_STORAGE_ORIGIN,
  tenantCode: new URL(developmentIssuer).pathname.split("/")[2],
  apiAudience:
    import.meta.env.VITE_API_AUDIENCE ?? "https://api.gaegaeting.app",
  issuer:
    import.meta.env.VITE_OIDC_ISSUER ??
    "http://localhost:3010/t/gaegaeting/oidc",
  authOrigin:
    import.meta.env.VITE_AUTH_ORIGIN ??
    new URL(import.meta.env.VITE_OIDC_ISSUER ?? "http://localhost:3010").origin,
  clientId:
    import.meta.env.VITE_OIDC_CLIENT_ID ??
    (import.meta.env.BASE_URL === "/admin/"
      ? "gaegaeting-admin-web"
      : "gaegaeting-web"),
  accountUrl:
    import.meta.env.VITE_ACCOUNT_GRAPHQL_URL ??
    "http://localhost:2800/account/graphql",
  gatewayUrl:
    import.meta.env.VITE_GATEWAY_GRAPHQL_URL ??
    "http://localhost:8080/gateway/graphql",
};

if (import.meta.env.PROD && !window.GAEGAETING_CONFIG) {
  throw new Error("배포 환경의 서비스 연결 설정이 없습니다.");
}
export const publicConfig = window.GAEGAETING_CONFIG ?? developmentConfig;
