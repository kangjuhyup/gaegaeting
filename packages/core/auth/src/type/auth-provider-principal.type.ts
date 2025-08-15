import { AuthProvider } from "./enum/auth-provider.enum";

export interface AuthProviderPrincipal {
    providerType : AuthProvider;
    providerId : string;
}