import { validateSync } from 'class-validator';
import { FeedItemStatus } from '@app/feed/domain/enum/feed-item-status.enum';
import { ActionFeedInput } from '@app/feed/infrastructure/adapter/inbound/gql/dto/action-feed.input';

describe('ActionFeedInput (UNIT)', () => {
  it('state가 유효하면 FeedItemStatus로 변환된다', () => {
    const input = new ActionFeedInput();
    input.id = 1;
    input.state = 'VIEW';

    const errors = validateSync(input);
    expect(errors).toHaveLength(0);

    const status = input.toStatus();
    expect(status).toEqual(FeedItemStatus.VIEW);
  });

  it('state가 유효하지 않으면 validation 에러가 난다', () => {
    const input = new ActionFeedInput();
    input.id = 1;
    input.state = 'INVALID';

    const errors = validateSync(input);
    expect(errors.length).toBeGreaterThan(0);
  });
});


