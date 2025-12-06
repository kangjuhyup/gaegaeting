import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { PetProfileOrmEntity } from "./pet-profile";
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
    
    @ManyToOne(() => PetProfileOrmEntity, (pet) => pet.attachments)
    @JoinColumn({ name: "pet_id" })
    pet: PetProfileOrmEntity;
}