import { PetsByUserIdLoader } from '@app/user/infrastructure/adapter/inbound/gql/dataloader/pets-by-user-id.loader';
import { GetPetsByUserIdsQuery } from '@app/pet/application/port/query/get-pets-by-user-ids.port';

describe('PetsByUserIdLoader', () => {
  it('batches multiple userId loads into a single QueryBus.execute call', async () => {
    const execute = jest.fn().mockResolvedValue({
      u1: [{ pet: { id: 1, userId: 'u1' }, profile: [] }],
      u2: [{ pet: { id: 2, userId: 'u2' }, profile: [] }],
    });
    const queryBus = { execute } as any;

    const loader = new PetsByUserIdLoader(queryBus);

    const p1 = loader.load('u1');
    const p2 = loader.load('u2');
    const [v1, v2] = await Promise.all([p1, p2]);

    expect(execute).toHaveBeenCalledTimes(1);
    const query = execute.mock.calls[0][0];
    expect(query).toBeInstanceOf(GetPetsByUserIdsQuery);
    expect(query.userIds).toEqual(['u1', 'u2']);

    expect(v1).toHaveLength(1);
    expect((v1 as any)[0].pet.userId).toBe('u1');
    expect(v2).toHaveLength(1);
    expect((v2 as any)[0].pet.userId).toBe('u2');
  });

  it('caches per key within the same loader instance', async () => {
    const execute = jest.fn().mockResolvedValue({
      u1: [{ pet: { id: 1, userId: 'u1' }, profile: [] }],
    });
    const queryBus = { execute } as any;

    const loader = new PetsByUserIdLoader(queryBus);

    await loader.load('u1');
    await loader.load('u1');

    expect(execute).toHaveBeenCalledTimes(1);
  });
});

