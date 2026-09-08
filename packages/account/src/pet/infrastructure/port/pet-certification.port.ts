export abstract class PetCertificationPort {

    abstract checkCertifiaction(ownerName:string, certificationCode:string) : Promise<boolean>
}