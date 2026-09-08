// 반려동물 성별
type PetGenderValue = {
    label : string,
    value : number
}
export const PetGender = {
    MALE : { label : 'MALE' , value : 0 },
    FEMALE : { label : 'FEMALE' , value : 1 },

    from : (value:number) : PetGenderValue => {
        const entries = Object.entries(PetGender) as [string, PetGenderValue][];
        for (const [key, val] of entries) {
            if (key !== 'from' && val.value === value) {
                return val;
            }
        }
        throw new Error(`${value}에 해당하는 PetGender를 찾을 수 없습니다.`);
    }
} as const;
export type PetGender = PetGenderValue;

// 반려동물 크기
type PetSizeValue = {
    label : string,
    value : number
}
export const PetSize = {
    SMALL : { label : 'SMALL' , value : 0 },
    MEDIUM : { label : 'MEDIUM' , value : 1 },
    LARGE : { label : 'LARGE' , value : 2 },

    from : (value:number) : PetSizeValue => {
        const entries = Object.entries(PetSize) as [string, PetSizeValue][];
        for (const [key, val] of entries) {
            if (key !== 'from' && val.value === value) {
                return val;
            }
        }
        throw new Error(`${value}에 해당하는 PetSize를 찾을 수 없습니다.`);
    }
} as const;
export type PetSize = PetSizeValue;

// 반려동물 견종
type PetBreedValue = {
    label : string,
    value : number
}
export const PetBreed = {
    MALTESE : { label : 'MALTESE' , value : 0 },
    POODLE : { label : 'POODLE' , value : 1 },
    CHIHUAHUA : { label : 'CHIHUAHUA' , value : 2 },
    POMERANIAN : { label : 'POMERANIAN' , value : 3 },
    SHIH_TZU : { label : 'SHIH_TZU' , value : 4 },
    YORKSHIRE : { label : 'YORKSHIRE' , value : 5 },
    BEAGLE : { label : 'BEAGLE' , value : 6 },
    GOLDEN_RETRIEVER : { label : 'GOLDEN_RETRIEVER' , value : 7 },
    LABRADOR : { label : 'LABRADOR' , value : 8 },
    HUSKY : { label : 'HUSKY' , value : 9 },
    SAMOYED : { label : 'SAMOYED' , value : 10 },
    WELSH_CORGI : { label : 'WELSH_CORGI' , value : 11 },
    JINDO : { label : 'JINDO' , value : 12 },
    MIXED : { label : 'MIXED' , value : 13 },
    OTHER : { label : 'OTHER' , value : 14 },

    from : (value:number) : PetBreedValue => {
        const entries = Object.entries(PetBreed) as [string, PetBreedValue][];
        for (const [key, val] of entries) {
            if (key !== 'from' && val.value === value) {
                return val;
            }
        }
        throw new Error(`${value}에 해당하는 PetBreed를 찾을 수 없습니다.`);
    }
} as const;
export type PetBreed = PetBreedValue;

// 반려동물 성격 유형
type PetPersonalityValue = {
    label : string,
    value : number
}
export const PetPersonality = {
    FRIENDLY : { label : 'FRIENDLY' , value : 0 },
    SHY : { label : 'SHY' , value : 1 },
    ACTIVE : { label : 'ACTIVE' , value : 2 },
    CALM : { label : 'CALM' , value : 3 },
    PLAYFUL : { label : 'PLAYFUL' , value : 4 },
    PROTECTIVE : { label : 'PROTECTIVE' , value : 5 },
    CURIOUS : { label : 'CURIOUS' , value : 6 },
    INDEPENDENT : { label : 'INDEPENDENT' , value : 7 },

    from : (value:number) : PetPersonalityValue => {
        const entries = Object.entries(PetPersonality) as [string, any][];
        for (const [key, val] of entries) {
            if (key !== 'from' && typeof val === 'object' && val !== null && 'value' in val && val.value === value) {
                return val;
            }
        }
        throw new Error(`${value}에 해당하는 PetPersonality를 찾을 수 없습니다.`);
    }
} as const;
export type PetPersonality = PetPersonalityValue;