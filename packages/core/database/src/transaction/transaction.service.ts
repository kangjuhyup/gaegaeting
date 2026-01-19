import { Injectable, OnModuleInit } from "@nestjs/common";
import { DataSource } from "typeorm";
import { TransactionContext } from "./transaction-context";

@Injectable()
export class TransactionService implements OnModuleInit {
    constructor(
        private readonly dataSource: DataSource,
    ) {}

    async onModuleInit() {
        // TypeOrmModule이 DataSource 초기화는 담당합니다.
        // 여기서는 TransactionContext가 사용할 DataSource가 존재함을 보장하기 위해 touch 합니다.
        // (DI로 주입된 DataSource가 준비되어 있지 않으면 Nest가 여기서 실패합니다.)
        void TransactionContext.getDataSource();
        void this.dataSource;
    }
}