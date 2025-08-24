import { ENV_KEY } from "@app/config/env.config";
import { Pet } from "@app/feed/domain/model/vo/pet";
import { PetApiPort } from "@app/feed/domain/port/pet-api.port";
import { FetchHttpClient } from "@core/http";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class PetApiAdpater implements PetApiPort {

    constructor(
        @Inject('HTTP_CLIENT_MATCH-FEED') private readonly httpClient : FetchHttpClient
    ){}
    
    async getPetsFromUser(userId:string) : Promise<Pet[]> {
        const response = await this.httpClient.get<{
            userId : string,
            pets : {
                id : number,
                name : string,
                age : number,
                gender : string,
                breed : string,
                size : string,
                personalities : string[],
                description : string,
                profileImages? : string[],
            }[]
        }>(`${ENV_KEY.USER_SERVICE_HOST}/pets/user/${userId}`);
        
        return response.data.pets.map((pet) => new Pet(pet.id,pet.name,pet.age,pet.gender,pet.breed,pet.size,pet.personalities,pet.description,pet.profileImages));
    }
}