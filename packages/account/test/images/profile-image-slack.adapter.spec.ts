import { jest } from "@jest/globals";
import { Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { throwError } from "rxjs";
import { createServer } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { SlackModule, SlackService } from "@core/slack";
import { ProfileImageSlackAdapter } from "../../src/common/profile-images/profile-image-slack.adapter.js";
import { envSpec } from "../../src/config/env.config.js";

describe("Photo request Slack notifications", () => {
  const webhookUrl = "https://hooks.slack.test/services/secret";
  const config = (url?: string) => ({ get: () => url });

  test.each(["USER", "PET"] as const)(
    "%s requests tell administrators what to review without exposing the photo",
    async (kind) => {
      const slack = { sendMessage: jest.fn(async () => undefined) };
      const adapter = new ProfileImageSlackAdapter(
        slack as any,
        config(webhookUrl) as any,
      );
      await adapter.notifySubmitted({
        kind,
        targetId: kind === "USER" ? "owner" : "1",
        userId: "owner",
        imageNo: 5,
      });
      expect(slack.sendMessage).toHaveBeenCalledWith({
        text: "사진 등록 요청이 도착했습니다. 관리자 화면에서 검토해 주세요.",
        attachments: [
          {
            color: "warning",
            title: `${kind === "USER" ? "사용자" : "반려견"} 사진 승인 대기`,
            fields: [
              { title: "요청자 ID", value: "owner", short: true },
              {
                title: "대상 ID",
                value: kind === "USER" ? "owner" : "1",
                short: true,
              },
              { title: "사진 번호", value: "6", short: true },
            ],
            footer: "Gaegaeting Account",
          },
        ],
      });
    },
  );

  test.each([undefined, ""])(
    "no webhook configuration (%s) leaves notifications disabled",
    async (url) => {
      const slack = { sendMessage: jest.fn(async () => undefined) };
      const adapter = new ProfileImageSlackAdapter(
        slack as any,
        config(url) as any,
      );
      await adapter.notifySubmitted({
        kind: "USER",
        targetId: "owner",
        userId: "owner",
        imageNo: 0,
      });
      expect(slack.sendMessage).not.toHaveBeenCalled();
    },
  );

  test.each(["sync", "async"] as const)(
    "%s Slack registration injects an HTTP client that can send an alert",
    async (mode) => {
      const requests: Array<{ url?: string; payload: unknown }> = [];
      const server = createServer(async (request, response) => {
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        requests.push({
          url: request.url,
          payload: JSON.parse(Buffer.concat(chunks).toString()),
        });
        response.end("ok");
      });
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const localWebhook = `http://127.0.0.1:${(server.address() as AddressInfo).port}/slack`;
      const registration =
        mode === "sync"
          ? SlackModule.forRoot({ webhookUrl: localWebhook })
          : SlackModule.forRootAsync({
              imports: [ConfigModule],
              inject: [ConfigService],
              useFactory: (settings: ConfigService) => ({
                webhookUrl: settings.get<string>("SLACK_WEBHOOK_URL")!,
              }),
            });
      try {
        const module = await Test.createTestingModule({
          imports: [registration],
        })
          .overrideProvider(ConfigService)
          .useValue(config(localWebhook))
          .compile();
        try {
          await module
            .get(SlackService)
            .sendMessage({ text: "사진 등록 요청" });
          expect(requests).toEqual([
            { url: "/slack", payload: { text: "사진 등록 요청" } },
          ]);
        } finally {
          await module.close();
        }
      } finally {
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );

  test("Slack HTTP failures do not expose the secret webhook in logs or returned errors", async () => {
    const http = { post: () => throwError(() => new Error(webhookUrl)) };
    const slack = new SlackService(http as any, { webhookUrl });
    const log = jest
      .spyOn((slack as unknown as { logger: Logger }).logger, "error")
      .mockImplementation(() => undefined);
    try {
      await expect(
        slack.sendMessage({ text: "사진 등록 요청" }),
      ).rejects.toThrow("Failed to send Slack message");
      expect(log).toHaveBeenCalledWith("Failed to send Slack message");
    } finally {
      log.mockRestore();
    }
  });

  test.each(["http://hooks.slack.test/secret", "invalid-url"])(
    "invalid webhook setting %s is rejected at startup",
    (value) => {
      expect(envSpec.SLACK_WEBHOOK_URL.joi.validate(value).error).toBeDefined();
    },
  );
});
