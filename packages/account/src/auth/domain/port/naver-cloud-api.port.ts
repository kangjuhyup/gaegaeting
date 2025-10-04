export abstract class NaverCloudApiPort {

    abstract sendSms(phoneNumber:string,message:string) : Promise<void>
}