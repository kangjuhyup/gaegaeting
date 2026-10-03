import { Module } from "@nestjs/common";
import { PairInfrastructureModule } from "../infrastructure/pair.infrastructure.module.js";
import { SavePairHandler } from './service/command/save-pair.command.js';
import { CancelPairHandler } from './service/command/cancel-pair.command.js';
import { PariEventHandler } from '../infrastructure/adapter/inbound/event/pair.handler.js';
import { GetChatPairsHandler } from './service/query/get-chat-pairs.query.js';

@Module({
    imports : [
        PairInfrastructureModule
    ],
    providers: [GetChatPairsHandler, SavePairHandler, CancelPairHandler, PariEventHandler],
})
export class PairApplicationModule{}
