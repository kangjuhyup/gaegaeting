import { SetMainAreaCommand } from '@app/location/application/port/command/set-main-area.port';
import { SetMainAreaHandler } from '@app/location/application/service/command/set-main-area.command';
import { MainAreaEntity } from '@app/location/domain/model/main-area';
import { MainAreaRepositoryPort } from '@app/location/domain/port/main-area.repository.port';

describe('SetMainAreaHandler (UNIT)', () => {
  let handler: SetMainAreaHandler;
  let repo: jest.Mocked<MainAreaRepositoryPort>;

  const user = { userId: 'user-1' } as any;

  beforeEach(() => {
    repo = {
      saveMainArea: jest.fn(),
      selectMainAreaFromUserId: jest.fn(),
    } as unknown as jest.Mocked<MainAreaRepositoryPort>;

    const dataSource = {
      transaction: async (cb: any) => cb({}),
    } as any;

    handler = new SetMainAreaHandler(repo, dataSource);
  });

  it('유효한 code면 enum 테이블 기준으로 name/parentCode를 매핑해 저장한다', async () => {
    repo.saveMainArea.mockImplementation(async (m: MainAreaEntity) => m);

    const result = await handler.execute(new SetMainAreaCommand(user, '11' as any));

    expect(repo.saveMainArea).toHaveBeenCalledTimes(1);
    const saved = (repo.saveMainArea as jest.Mock).mock.calls[0][0] as MainAreaEntity;
    expect(saved.code).toBe('11');
    expect(saved.name).toBe('서울특별시');
    expect(saved.parentCode).toBeUndefined();

    expect(result.code).toBe('11');
  });

  it('존재하지 않는 code면 에러를 던진다', async () => {
    await expect(handler.execute(new SetMainAreaCommand(user, '99999' as any))).rejects.toThrow(
      'Invalid main area code',
    );
    expect(repo.saveMainArea).not.toHaveBeenCalled();
  });
});


