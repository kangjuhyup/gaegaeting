export abstract class AuthInternalApiPort {

    abstract setUserId(providerType:number,providerId:string, userId : string) : Promise<void> 
}