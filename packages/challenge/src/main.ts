import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { pathToFileURL } from "node:url";
import { AppModule } from "./app.module.js";

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix("challenge");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(
    app.get(ConfigService).getOrThrow<number>("CHALLENGE_SERVICE_API_PORT"),
  );
  return app;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  void bootstrap().catch((error: unknown) => {
    console.error("Failed to start challenge service", error);
    process.exitCode = 1;
  });
}
