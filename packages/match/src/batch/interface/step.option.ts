export interface StepOption {
    name : string;
    chunkSize?: number;
    onChunkStart?: (n: number) => void;
    onChunkEnd?: (ok: number, skipped: number) => void;   
}