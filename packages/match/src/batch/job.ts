import { Logger } from '@nestjs/common';
import { Step } from './step';

export class Job {
    private readonly logger = new Logger(Job.name);
  constructor(private readonly name: string, private readonly steps: Step<any, any>[]) {}

  async run(): Promise<void> {
    this.logger.log(`Start`);
    for (const step of this.steps) {
      const res = await step.run();
      this.logger.log(`Step done`, res);
    }
    this.logger.log(`Done`);
  }
}
