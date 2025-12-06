import { Entity, ManyToOne, JoinColumn, PrimaryColumn, Index } from 'typeorm';
import { UserOrmEntity } from './user';
import { GroupOrmEntity } from './group';

@Entity({ name: 'user_group' })
@Index('idx_ug_grp', ['groupId'])
export class UserGroupOrmEntity {
  @PrimaryColumn({ name: 'user_id', type: 'char', length: 26 })
  userId!: string;

  @PrimaryColumn({ name: 'group_id', type: 'bigint' })
  groupId!: string;

  @ManyToOne(() => UserOrmEntity, (u) => u.userGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;

  @ManyToOne(() => GroupOrmEntity, (g) => g.userGroups, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group!: GroupOrmEntity;
}