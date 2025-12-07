import { Column, Entity, ManyToOne, PrimaryGeneratedColumn, JoinColumn } from "typeorm";
import { UserProfileOrmEntity } from "./user-profile";
import { UserReportStatus } from "./enum/user-report-status";
import { UserReportType } from "./enum/user-report-type";
import { ValueEnumTransformer } from "../../transformer/value-enum.transformer";

/**
 * 사용자 신고 엔티티
 *
 * 이 엔티티는 사용자 신고 정보를 데이터베이스에 저장하기 위한 TypeORM 엔티티입니다.
 * 사용자가 다른 사용자를 신고할 때 사용됩니다.
 */
@Entity("user_report")
export class UserReportOrmEntity {
  /**
   * 신고 ID
   */
  @PrimaryGeneratedColumn({ name: 'id' })
  id: number;

  /**
   * 신고자 ID
   * 신고를 한 사용자의 ID
   */
  @Column({ type: 'char', length: 26, nullable: false, name: 'reporter_id' })
  reporterId: string;

  /**
   * 신고 대상 사용자 ID
   * 신고를 받은 사용자의 ID
   */
  @Column({ type: 'char', length: 26, nullable: false, name: 'reported_user_id' })
  reportedUserId: string;

  /**
   * 신고 유형
   * 
   * 신고의 유형을 나타냅니다.
   * 기본값은 OTHER(4)입니다.
   * 
   * @see UserReportType
   * - INAPPROPRIATE_PROFILE(0): 부적절한 프로필
   * - SPAM(1): 스팸/광고
   * - HARASSMENT(2): 괴롭힘/욕설
   * - FRAUD(3): 사기/부정행위
   * - OTHER(4): 기타
   */
  @Column({ 
    type: 'tinyint', 
    nullable: false,
    default: UserReportType.OTHER.value,
    name: 'report_type',
    transformer: new ValueEnumTransformer(UserReportType),
  })
  reportType: UserReportType;

  /**
   * 신고 내용
   * 신고 사유에 대한 상세 설명
   */
  @Column({ type: 'text', nullable: true, name: 'content' })
  content?: string;

  /**
   * 신고 상태
   * 
   * 신고의 처리 상태를 나타냅니다.
   * 기본값은 PENDING(0)입니다.
   * 
   * @see UserReportStatus
   * - PENDING(0): 대기 상태
   * - PROCESSING(1): 처리 중 상태
   * - RESOLVED(2): 처리 완료 상태
   * - REJECTED(3): 거부 상태
   */
  @Column({ 
    type: 'tinyint', 
    nullable: false,
    default: UserReportStatus.PENDING.value,
    name: 'status',
    transformer: new ValueEnumTransformer(UserReportStatus),
  })
  status: UserReportStatus;

  /**
   * 처리 결과
   * 관리자가 신고를 처리한 결과에 대한 설명
   */
  @Column({ type: 'text', nullable: true, name: 'resolution' })
  resolution?: string;

  /**
   * 처리자 ID
   * 신고를 처리한 관리자의 ID (선택)
   */
  @Column({ type: 'char', length: 26, nullable: true, name: 'resolved_by' })
  resolvedBy?: string;

  /**
   * 처리 일시
   * 신고가 처리된 일시
   */
  @Column({ type: 'datetime', nullable: true, name: 'resolved_at' })
  resolvedAt?: Date;

  /**
   * 신고자 (사용자 프로필) 참조
   */
  @ManyToOne(() => UserProfileOrmEntity, { nullable: false })
  @JoinColumn({ name: 'reporter_id' })
  reporter: UserProfileOrmEntity;

  /**
   * 신고 대상 사용자 (사용자 프로필) 참조
   */
  @ManyToOne(() => UserProfileOrmEntity, { nullable: false })
  @JoinColumn({ name: 'reported_user_id' })
  reportedUser: UserProfileOrmEntity;
}

