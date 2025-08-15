import { AuthProvider } from "./enum/auth-provider.enum";

export interface AuthProviderPrincipal {
    provider : AuthProvider;
    providerId : string;
}