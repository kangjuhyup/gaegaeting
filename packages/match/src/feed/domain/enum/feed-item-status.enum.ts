type FeedItemStatusValue = {
    label : string,
    value : number
}
export const FeedItemStatus = {
    DELIVERY : { label : 'DELIVERY' , value : 0 },
    VIEW : { label : 'VIEW' , value : 1 },
    LIKE : { label : 'LIKE' , value : 2 },
    PASS : { label : 'PASS' , value : 3 },

    from : (value:number) : FeedItemStatusValue => {
        const entries = Object.entries(FeedItemStatus) as [string, FeedItemStatusValue][];
        for (const [key, val] of entries) {
            if (key !== 'from' && val.value === value) {
                return val;
            }
        }
        throw new Error(`${value}에 해당하는 FeedItemStatus를 찾을 수 없습니다.`);
    }
} as const;
export type FeedItemStatus = FeedItemStatusValue;