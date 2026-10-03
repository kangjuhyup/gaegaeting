import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SlackService } from "@core/slack";
import { ENV_KEY } from "../../config/env.config.js";
import {
  ProfileImageNotificationPort,
  type ProfileImageSubmission,
} from "./profile-image-notification.port.js";

@Injectable()
export class ProfileImageSlackAdapter extends ProfileImageNotificationPort {
  constructor(
    private readonly slack: SlackService,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async notifySubmitted(submission: ProfileImageSubmission): Promise<void> {
    if (!this.config.get<string>(ENV_KEY.SLACK_WEBHOOK_URL)) return;
    await this.slack.sendMessage({
      text: "사진 등록 요청이 도착했습니다. 관리자 화면에서 검토해 주세요.",
      attachments: [
        {
          color: "warning",
          title: `${submission.kind === "USER" ? "사용자" : "반려견"} 사진 승인 대기`,
          fields: [
            { title: "요청자 ID", value: submission.userId, short: true },
            { title: "대상 ID", value: submission.targetId, short: true },
            {
              title: "사진 번호",
              value: String(submission.imageNo + 1),
              short: true,
            },
          ],
          footer: "Gaegaeting Account",
        },
      ],
    });
  }
}
