export abstract class AcocuntApiPort {
    abstract checkRegisted(providerType:number,provierId:string) : Promise<{ profileRegistered : boolean , phoneVerified : boolean , petRegistered : boolean }>
}