export abstract class ChallengeTransaction {
  abstract run<T>(userId: string, work: () => Promise<T>): Promise<T>;
}
