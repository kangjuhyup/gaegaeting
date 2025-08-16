import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { PetOrmEntity } from "./pet";
import { BaseEntity } from "../base";

@Entity('pet_attachment')
export class PetAttachmentOrmEntity extends BaseEntity {
    @PrimaryColumn({type: 'int', name : "pet_id"})
    petId : number;
    @PrimaryColumn({ type : 'int', name : 'no', default : 0 })
    no : number;

    @Column({type : 'varchar', length: 255, name : "path"})
    path : string;

    @Column({type : 'boolean', name : 'is_active', default : false})
    isActive : boolean;
    
    @ManyToOne(() => PetOrmEntity, (pet) => pet.attachments)
    @JoinColumn({ name: "pet_id" })
    pet: PetOrmEntity;
}