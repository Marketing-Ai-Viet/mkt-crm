import { Field, InputType } from '@nestjs/graphql';

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
} from 'class-validator';

/**
 * Input for assigning a role/template to a user
 */
@InputType('AssignRoleInput')
export class AssignRoleInput {
  @Field(() => String, { description: 'User ID to assign role to' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @Field(() => String, { description: 'Permission template ID to assign' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @Field(() => String, {
    nullable: true,
    description: 'Expiration date for assignment (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Reason for assignment',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * Input for revoking a role/template from a user
 */
@InputType('RevokeRoleInput')
export class RevokeRoleInput {
  @Field(() => String, { description: 'User ID to revoke role from' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @Field(() => String, { description: 'Permission template ID to revoke' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @Field(() => String, {
    nullable: true,
    description: 'Reason for revoking',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
