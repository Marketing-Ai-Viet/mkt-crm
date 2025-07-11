import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoginToken2FA {
  @Field()
  message: string;

  @Field()
  requiresTwoFactor: boolean;
}

