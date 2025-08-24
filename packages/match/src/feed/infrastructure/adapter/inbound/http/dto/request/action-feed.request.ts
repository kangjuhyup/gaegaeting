import { FeedItemStatus } from "@app/feed/domain/enum/feed-item-status.enum";
import { EnumTransformPipe } from "@core/util";
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty } from "class-validator";

export class ActionFeedBody {
    @ApiProperty({description : '피드아이템 상태'})
    @EnumTransformPipe(FeedItemStatus, '유효한 피드아이템 상태가 아닙니다.')
    @IsNotEmpty({ message: "액션은 필수 입력 항목입니다." })
    action : FeedItemStatus
}