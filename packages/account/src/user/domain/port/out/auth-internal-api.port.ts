import { AuthProvider, AuthProviderPrincipal } from "@core/auth";

export abstract class AuthInternalApiPort {

    abstract setUserId(authProvider:AuthProviderPrincipal, userId : string) : Promise<void> 
}