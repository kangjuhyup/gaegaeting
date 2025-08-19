import { PersistenceEntity } from "@core/model";

/**
 * Location 도메인 모델 인터페이스
 */
interface ILocation {
    latitude: number;
    longitude: number;
    city?: string;
    district?: string;
}

/**
 * Location 도메인 엔티티
 * 사용자의 위치 정보를 나타내는 도메인 모델
 */
export class LocationEntity extends PersistenceEntity<string, ILocation> {
   
    constructor(param: ILocation) {
        super(param);
    }

    /**
     * 위도 반환
     */
    get latitude(): number {
        return this.etc.latitude;
    }

    /**
     * 경도 반환
     */
    get longitude(): number {
        return this.etc.longitude;
    }

    /**
     * 도시명 반환
     */
    get city(): string | undefined {
        return this.etc.city;
    }

    /**
     * 지역구 반환
     */
    get district(): string | undefined {
        return this.etc.district;
    }

    static of(param:ILocation) : LocationEntity {
        return new LocationEntity(param);
    }

    /**
     * 두 위치 간의 거리를 계산 (하버사인 공식 사용)
     * @param other 비교할 다른 위치
     * @returns 거리 (미터 단위)
     */
    distanceTo(other: LocationEntity): number {
        const earthRadius = 6371e3; // 지구 반경 (미터)
        const lat1Rad = this.latitude * Math.PI / 180;
        const lat2Rad = other.latitude * Math.PI / 180;
        const latDiffRad = (other.latitude - this.latitude) * Math.PI / 180;
        const lngDiffRad = (other.longitude - this.longitude) * Math.PI / 180;

        const a = Math.sin(latDiffRad / 2) * Math.sin(latDiffRad / 2) +
                Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                Math.sin(lngDiffRad / 2) * Math.sin(lngDiffRad / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return earthRadius * c;
    }

    /**
     * 특정 반경 내에 위치하는지 확인
     * @param other 비교할 다른 위치
     * @param radiusInMeters 반경 (미터 단위)
     * @returns 반경 내에 있으면 true, 아니면 false
     */
    isWithinRadius(other: LocationEntity, radiusInMeters: number): boolean {
        return this.distanceTo(other) <= radiusInMeters;
    }

    /**
     * 위치 정보를 문자열로 반환
     */
    toString(): string {
        return `위치(${this.etc.latitude}, ${this.etc.longitude})${this.etc.city ? `, ${this.etc.city}` : ''}${this.etc.district ? ` ${this.etc.district}` : ''}`;
    }
}