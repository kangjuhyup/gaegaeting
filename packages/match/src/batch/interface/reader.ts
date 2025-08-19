export interface ItemReader<T> {
    open?() : Promise<void>
    read() : Promise<T | null>
    close?() : Promise<void>
}