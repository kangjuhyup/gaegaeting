export interface ItemWriter<O> {
    write(items:O[]): Promise<void>
}