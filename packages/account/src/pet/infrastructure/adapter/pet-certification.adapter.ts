import { Injectable } from "@nestjs/common";
import { PetCertificationPort } from "@app/pet/domain/port/out/pet-certification.port";
import { FetchHttpClient } from "@core/http";
import { ConfigService } from "@nestjs/config";
import { PetCeritifcationResponse } from "./dto/pet-certification.dto";

@Injectable()
export class PetCertificationAdapter implements PetCertificationPort {
    
    private readonly URL = 'https://apis.data.go.kr/1543061/animalInfoSrvc_v3';
    private readonly API_KEY : string;
    constructor(
        private readonly fetchClient : FetchHttpClient,
        private readonly config : ConfigService
    ){
        this.API_KEY = this.config.get<string>('PUBLIC_DATA_API_KEY');
    }

    /**
     * 동물등록 정보를 검증합니다.
     * @param ownerName 소유자 이름
     * @param certificationCode 동물등록번호
     * @returns 등록 정보 일치 여부
     */
    async checkCertifiaction(ownerName: string, certificationCode: string): Promise<boolean> {
        try {
            const encodedOwnerName = encodeURIComponent(ownerName);
            const encodedCertCode = encodeURIComponent(certificationCode);
            
            const response = await this.fetchClient.get<PetCeritifcationResponse>(
                `${this.URL}?serviceKey=${this.API_KEY}&owner_nm=${encodedOwnerName}&dog_reg_no=${encodedCertCode}&_type=json`
            );
            
            const responseData = response.data;
            
            if (responseData?.header?.resultCode !== '00') {
                return false;
            }
            
            // 데이터 존재 여부 확인
            const item = responseData?.body?.item;
            if (!item) {
                return false;
            }
            
            // 등록 정보 일치 여부 확인
            // TODO : 이름,성별,생년월일,종 등 확인한다.
            const isRegistered = item.dogRegNo === certificationCode;
            
            if (!isRegistered) {
                return false;
            }
            
            return isRegistered;
        } catch (error) {
            return false;
        }
    }
}