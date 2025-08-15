import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { UserOrmEntity } from "./user";
import { BaseEntity } from "../base";

@Entity('user_attachment')
export class UserAttachmentOrmEntity extends BaseEntity {

    @PrimaryGeneratedColumn({name : "id"})
    id : number;

    @Column({ type : 'int', name : 'no', default : 0 })
    no : number;

    @Column({type : 'varchar', length: 255, name : "path"})
    path : string;

    @Column({type : 'boolean', name : 'is_active'})
    isActive : boolean;

    @Column({type: 'char', length : 26, name : "user_id"})
    userId : string;
    /**
     * 첨부파일 업로드 사용자
     */
    @ManyToOne(() => UserOrmEntity, (user) => user.attachments)
    @JoinColumn({ name: "user_id" })
    user: UserOrmEntity;

}