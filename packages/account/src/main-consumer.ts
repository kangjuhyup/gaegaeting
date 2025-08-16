import { NestFactory } from "@nestjs/core";
import { ConsumerModule } from "./consumer.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

async function bootstrap() {
    const app = await NestFactory.create(ConsumerModule);
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: { brokers: [process.env.KAFKA_BROKERS!] },
      },
    });
    await app.startAllMicroservices();
  }
  bootstrap();