import { Injectable } from '@nestjs/common';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerCodeGenerationService } from 'src/mkt-core/customer/services/mkt-customer-code-generation.service';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class MktCustomerCreationService {
  constructor(
    private readonly mktRepo: MktRepositoryService,
    private readonly customerCodeService: MktCustomerCodeGenerationService,
  ) {}

  async createCustomerFromPerson(
    workspaceId: string,
    userId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    const repo = await this.mktRepo.getCustomerRepository();

    // Tạo customer code tự động
    const mktCustomerCode =
      await this.customerCodeService.generateUniqueCustomerCode(true);

    const customerData: Partial<MktCustomerWorkspaceEntity> = {
      userId,
      mktWorkspaceId: workspaceId,
      mktCustomerCode,
      name: [person.name?.firstName, person.name?.lastName]
        .filter(Boolean)
        .join(' '),
      email: person.emails?.primaryEmail || '',
      phone: person.phones?.primaryPhoneNumber || '',
      companyName: person.company?.name || '',
    };

    await repo.save(customerData);
  }
}
