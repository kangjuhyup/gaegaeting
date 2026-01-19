import { UserAttachmentsByUserIdLoader } from '@app/user/infrastructure/adapter/inbound/gql/dataloader/user-attachments-by-user-id.loader';
import { GetUserAttachmentsByUserIdsQuery } from '@app/user/application/port/query/get-user-attachments-by-user-ids.port';

describe('UserAttachmentsByUserIdLoader', () => {
  it('batches multiple userId loads into a single QueryBus.execute call', async () => {
    const execute = jest.fn().mockResolvedValue({
      u1: [{ id: { userId: 'u1', no: 1 }, path: 'p1', active: true }],
      u2: [{ id: { userId: 'u2', no: 1 }, path: 'p2', active: true }],
    });
    const queryBus = { execute } as any;

    const loader = new UserAttachmentsByUserIdLoader(queryBus);
    const [a1, a2] = await Promise.all([loader.load('u1'), loader.load('u2')]);

    expect(execute).toHaveBeenCalledTimes(1);
    const query = execute.mock.calls[0][0];
    expect(query).toBeInstanceOf(GetUserAttachmentsByUserIdsQuery);
    expect(query.userIds).toEqual(['u1', 'u2']);

    expect(a1).toHaveLength(1);
    expect((a1 as any)[0].id.userId).toBe('u1');
    expect(a2).toHaveLength(1);
    expect((a2 as any)[0].id.userId).toBe('u2');
  });
});

