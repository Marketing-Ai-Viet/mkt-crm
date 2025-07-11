import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { LicenseStatusHistory } from './license-status-history.entity';

export enum LicenseStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  LOCKED = 'locked',
}

registerEnumType(LicenseStatus, {
  name: 'LicenseStatus',
});

@ObjectType()
@Entity('licenses')
export class License {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field()
  @Column({ unique: true })
  licenseCode: string;

  @Field()
  @Column()
  orderCode: string;

  @Field()
  @Column()
  productName: string;

  @Field()
  @Column()
  customerEmail: string;

  @Field()
  @Column()
  customerName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  customerContact?: string;

  @Field(() => LicenseStatus)
  @Column({ type: 'varchar', default: LicenseStatus.ACTIVE })
  status: LicenseStatus;

  @Field()
  @Column({ type: 'timestamp' })
  activatedAt: Date;

  @Field()
  @Column({ type: 'timestamp' })
  expiredAt: Date;

  @Field()
  @Column()
  saleInCharge: string;

  @Field()
  @Column()
  supportInCharge: string;

  @Field()
  @Column({ type: 'timestamp' })
  assignedAt: Date;

  @Field({ nullable: true })
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  currentVersion?: string;

  @Field({ nullable: true })
  @Column({ nullable: true, type: 'text' })
  deviceInfo?: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  internalNote?: string;

  @Field(() => [LicenseStatusHistory], { nullable: true })
  @OneToMany(() => LicenseStatusHistory, history => history.license, {
    cascade: true,
  })
  statusHistories: LicenseStatusHistory[];
}