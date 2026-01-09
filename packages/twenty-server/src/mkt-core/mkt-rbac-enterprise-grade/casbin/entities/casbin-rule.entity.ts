import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Casbin Rule Entity
 *
 * Lưu trữ các policy rules cho Casbin authorization engine.
 * Table này được sử dụng bởi Casbin TypeORM adapter.
 *
 * Schema:
 * - ptype: Policy type (p = permission, g = role grouping, g2 = resource grouping)
 * - v0-v5: Policy values tùy theo ptype:
 *   - p: subject, domain, object, action, effect
 *   - g: subject, role, domain
 *   - g2: resource, group
 *
 * Domain format: ws:{workspaceId} để isolate policies theo workspace
 */
@Entity('casbin_rule')
@Index('IDX_CASBIN_RULE_PTYPE', ['ptype'])
@Index('IDX_CASBIN_RULE_V0', ['v0'])
@Index('IDX_CASBIN_RULE_V1', ['v1'])
@Index('IDX_CASBIN_RULE_PTYPE_V0_V1', ['ptype', 'v0', 'v1'])
export class CasbinRuleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 10 })
  ptype: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  v0: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  v1: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  v2: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  v3: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  v4: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  v5: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
