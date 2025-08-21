import { CreateDateColumn, UpdateDateColumn } from "typeorm";

export class BaseEntity {

  @CreateDateColumn({ name: 'created_at', default: () => 'CURRENT_TIMESTAMP(6)' })
  createdAt: Date;
  
  @UpdateDateColumn({ name: 'updated_at', default: () => 'CURRENT_TIMESTAMP(6)', onUpdate: 'CURRENT_TIMESTAMP(6)' })
  updatedAt: Date;
}