export class PetCeritifcationResponse {
    header : {
        reqNo : string,
        resultCode : string,
        resultMsg : string,
        errorMsg : string
    };
    body : {
        item : {
            officeTel : string,
            aprGbNm : string,
            dogRegNo : string,
            rfidCd : string,
            rfidGubun : string,
            birthDt : string,
            dogNm : string,
            sexNm : string,
            kindNm : string,
            neuterYn : string,
            orgNm : string,
            regTm : string,
            aprTm : string
        }
    }
}