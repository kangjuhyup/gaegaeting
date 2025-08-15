import { CreateDateColumn, UpdateDateColumn } from "typeorm";

export class BaseEntity {

  /**
   * 생성일시
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}