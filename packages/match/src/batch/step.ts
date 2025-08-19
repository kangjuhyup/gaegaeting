// src/batch/core/step.ts

import { ItemProcessor } from "./interface/processor";
import { ItemReader } from "./interface/reader";
import { ItemWriter } from "./interface/writer";
import { StepOption } from "./interface/step.option";


export class Step<I, O> {
  constructor(
    private readonly reader: ItemReader<I>,
    private readonly processor: ItemProcessor<I, O>,
    private readonly writer: ItemWriter<O>,
    private readonly opts: StepOption,
  ) {}

  async run(): Promise<{ read: number; written: number; skipped: number }> {
    const chunkSize = this.opts.chunkSize ?? 100;
    let read = 0, written = 0, skipped = 0;

    if (this.reader.open) await this.reader.open();

    try {
      while (true) {
        const chunkIn: I[] = [];
        for (let i = 0; i < chunkSize; i++) {
          const item = await this.reader.read();
          if (!item) break;
          chunkIn.push(item);
        }
        if (chunkIn.length === 0) break; // 더 없음

        this.opts.onChunkStart?.(chunkIn.length);
        read += chunkIn.length;

        const processed: O[] = [];
        for (const item of chunkIn) {
          const out = await this.processor.process(item);
          if (out === null) { skipped++; continue; }
          processed.push(out);
        }

        if (processed.length > 0) {
          await this.writer.write(processed);
          written += processed.length;
        }

        this.opts.onChunkEnd?.(processed.length, chunkIn.length - processed.length);
      }
    } finally {
      if (this.reader.close) await this.reader.close();
    }
    return { read, written, skipped };
  }
}
