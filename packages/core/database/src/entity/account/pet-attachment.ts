import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { PetOrmEntity } from "./pet";

@Entity('pet_attachment')
export class PetAttachmentOrmEntity {
    @PrimaryGeneratedColumn({name : "id"})
    id : number;

    @Column({ type : 'int', name : 'no', default : 0 })
    no : number;

    @Column({type : 'varchar', length: 255, name : "path"})
    path : string;

    @Column({type : 'boolean', name : 'is_active'})
    isActive : boolean;

    @Column({type: 'int', name : "pet_id"})
    petId : number;
    
    @ManyToOne(() => PetOrmEntity, (pet) => pet.attachments)
    @JoinColumn({ name: "pet_id" })
    pet: PetOrmEntity;
}