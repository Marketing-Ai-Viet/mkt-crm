import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class OtpSetupTempResult {
  @Field()
  secret: string;

  @Field()
  qr: string;
}

@ObjectType()
export class OtpVerifyTempResult {
  @Field()
  verified: boolean;
  @Field()
  message: string;
}

@ObjectType()
export class GoogleAuthVerifyTempResult {
  @Field()
  success: boolean;
}