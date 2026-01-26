import { Field, InputType } from '@nestjs/graphql';

import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

@InputType()
export class UpdateSubManagerInput {
  @Field(() => String, { description: 'Sub-manager assignment ID' })
  @IsNotEmpty()
  @IsUUID()
  id: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether this is the primary sub-manager',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Additional notes about this assignment',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @Field(() => Boolean, {
    nullable: true,
    description: 'Whether this assignment is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class SetPrimarySubManagerInput {
  @Field(() => String, { description: 'Department ID' })
  @IsNotEmpty()
  @IsUUID()
  departmentId: string;

  @Field(() => String, {
    description: 'Sub-manager assignment ID to set as primary',
  })
  @IsNotEmpty()
  @IsUUID()
  subManagerId: string;
}
