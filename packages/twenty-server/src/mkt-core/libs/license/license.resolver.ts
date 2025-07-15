import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CreateLicenseInput } from './dto/create-license.input';
import { License } from './entities/license.entity';
import { LicenseService } from './license.service';

@Resolver(() => License)
export class LicenseResolver {
  constructor(private readonly licenseService: LicenseService) {}

  @Mutation(() => [License])
  async licenses(): Promise<License[]> {
    return this.licenseService.findAll();
  }

  @Mutation(() => License, { nullable: true })
  async licenseByCode(@Args('licenseCode') code: string): Promise<License | null> {
    return this.licenseService.findByCode(code);
  }

  @Mutation(() => License)
  async createLicense(@Args('input') input: CreateLicenseInput): Promise<License> {
    return this.licenseService.create(input);
  }
}