import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { License, LicenseStatus } from './license.entity';

@ObjectType()
@Entity('license_status_histories')
export class LicenseStatusHistory {
  @Field(() => ID)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => License, license => license.statusHistories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'license_id' })
  license: License;

  @Field(() => LicenseStatus)
  @Column({ type: 'varchar' })
  status: LicenseStatus;

  @Field()
  @Column({ type: 'timestamp' })
  changedAt: Date;

  @Field()
  @Column()
  changedBy: string;

  @Field({ nullable: true })
  @Column({ type: 'text', nullable: true })
  note?: string;
}
