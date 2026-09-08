import { NestFactory } from "@nestjs/core";
import { BatchModule } from "./batch/batch.module.js";

async function bootStrap() {
    await NestFactory.createApplicationContext(BatchModule);
}

bootStrap();