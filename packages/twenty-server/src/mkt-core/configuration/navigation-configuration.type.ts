import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('NavigationConfiguration')
export class NavigationConfigurationType {
  @Field(() => [String])
  hiddenObjects: string[];

  @Field(() => [String])
  hiddenItems: string[];

  @Field(() => [String])
  hiddenDataModelObjects: string[];
}
