import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { json } from "express";
import { pathToFileURL } from "node:url";
import { requestTraceMiddleware } from "@core/util/trace";
import { AppModule } from "./app.module.js";
import { PAYMENT_CONFIG } from "./common/runtime.module.js";
import type { PaymentConfiguration } from "./config.js";

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableShutdownHooks();
  app.use(json({ limit: "256kb" }));
  app.use(requestTraceMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.setGlobalPrefix("payment");
  const config = app.get<PaymentConfiguration>(PAYMENT_CONFIG);
  await app.listen(config.port);
  console.log(`Payment API listening on port ${config.port}`);
  return app;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void bootstrap().catch(() => {
    console.error(
      "Payment service startup failed; verify server configuration and connectivity.",
    );
    process.exitCode = 1;
  });
}
