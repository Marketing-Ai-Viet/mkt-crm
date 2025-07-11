import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OtpSetupResult {
  @Field()
  secret: string;

  @Field()
  qr: string;
}

@ObjectType()
export class OtpVerifyResult {
  @Field()
  verified: boolean;
  @Field()
  message: string;
}

@ObjectType()
export class GoogleAuthVerifyResult {
  @Field()
  success: boolean;
}