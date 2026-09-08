import { jest } from '@jest/globals';
import type { TransactionBoundary } from '../transaction/transaction-boundary.js';
import { bindTransactionBoundaryForTest } from '../transaction/bind-transaction-boundary-for-test.js';
import { Transactional } from './transaction.js';

class Subject {
  readonly prefix = 'done';

  @Transactional()
  async execute(suffix = ''): Promise<string> {
    return `${this.prefix}${suffix}`;
  }
}

describe('@Transactional', () => {
  it('delegates to the hidden boundary without constructor injection', async () => {
    const subject = new Subject();
    const boundary: TransactionBoundary = {
      owner: 'fake',
      run: jest.fn(async work => work()),
    };
    bindTransactionBoundaryForTest(subject, boundary);

    await expect(subject.execute('!')).resolves.toBe('done!');
    expect(boundary.run).toHaveBeenCalledTimes(1);
  });

  it('fails clearly when Nest did not inject a boundary', async () => {
    await expect(new Subject().execute()).rejects.toThrow(
      'No transaction boundary is registered for Subject.execute',
    );
  });
});
