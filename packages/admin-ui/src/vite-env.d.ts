/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OIDC_ISSUER?: string;
  readonly VITE_OIDC_CLIENT_ID?: string;
  readonly VITE_GATEWAY_GRAPHQL_URL?: string;
  readonly VITE_ACCOUNT_GRAPHQL_URL?: string;
  readonly VITE_AUTH_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
