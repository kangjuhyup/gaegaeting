import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { UserProfileOrmEntity } from "./user-profile";
import { BaseEntity } from "../base";

@Entity('user_attachment')
export class UserAttachmentOrmEntity extends BaseEntity {

    @PrimaryColumn({type: 'char', length : 26, name : "user_id"})
    userId : string;
 
    @PrimaryColumn({ type : 'int', name : 'no', default : 0 })
    no : number;

    @Column({type : 'varchar', length: 255, name : "path"})
    path : string;

    @Column({type : 'boolean', name : 'is_active', default : false})
    isActive : boolean;

    /**
     * 첨부파일 업로드 사용자
     */
    @ManyToOne(() => UserProfileOrmEntity, (user) => user.attachments)
    @JoinColumn({ name: "user_id" })
    user: UserProfileOrmEntity;

}