import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@/modules/users/entities/user.entity';

/**
 * 文件上传记录实体
 *
 * 用于追踪所有上传的文件信息，包括上传者、文件元数据等
 */
@Entity('upload_files')
@Index('idx_upload_user_id', ['userId'])
@Index('idx_upload_category', ['category'])
@Index('idx_upload_created_at', ['createdAt'])
export class UploadFile {
  @PrimaryColumn({ type: 'varchar', length: 36, comment: '文件ID（UUID）' })
  id: string;

  @Column({ type: 'varchar', name: 'userId', comment: '上传用户ID' })
  userId: string;

  @Column({ type: 'varchar', length: 255, comment: '原始文件名' })
  originalName: string;

  @Column({ type: 'varchar', length: 255, comment: '存储文件名（唯一）' })
  filename: string;

  @Column({ type: 'varchar', length: 50, comment: '文件MIME类型' })
  mimeType: string;

  @Column({ type: 'int', comment: '文件大小（字节）' })
  size: number;

  @Column({
    type: 'enum',
    enum: ['avatar', 'other'],
    default: 'other',
    comment: '文件分类',
  })
  category: 'avatar' | 'other';

  @Column({ type: 'varchar', length: 500, comment: '文件访问URL' })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true, comment: '文件路径' })
  filePath: string;

  @Column({
    type: 'enum',
    enum: ['active', 'deleted'],
    default: 'active',
    comment: '文件状态',
  })
  status: 'active' | 'deleted';

  @CreateDateColumn({ type: 'timestamp', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', comment: '更新时间' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true, comment: '删除时间' })
  deletedAt: Date | null;

  /**
   * 关联上传用户
   */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId', referencedColumnName: 'uid' })
  user: User;
}
