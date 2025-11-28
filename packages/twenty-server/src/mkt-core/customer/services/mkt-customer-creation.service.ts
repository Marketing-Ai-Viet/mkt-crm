import { Injectable } from '@nestjs/common';

import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class MktCustomerCreationService {
  constructor(private readonly mktRepo: MktRepositoryService) {}

  async createCustomerFromPerson(
    workspaceId: string,
    userId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    const repo = await this.mktRepo.getCustomerRepository();

    const customerData: Partial<MktCustomerWorkspaceEntity> = {
      userId,
      mktWorkspaceId: workspaceId,
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
