import { Injectable } from '@nestjs/common';

import { v4 as uuidv4 } from 'uuid';

import {
  ACCOUNT_PROVIDER,
  LINKED_ACCOUNT_STATUS,
} from 'src/mkt-core/customer/constants';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { LinkedAccount } from 'src/mkt-core/customer/types';
import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

import { MktCustomerCodeGenerationService } from './mkt-customer-code-generation.service';

@Injectable()
export class MktCustomerCreationService {
  constructor(
    private readonly customerRepository: MktCustomerRepository,
    private readonly customerCodeService: MktCustomerCodeGenerationService,
  ) {}

  async createCustomerFromPerson(
    _workspaceId: string,
    mktAccountId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    const repo = await this.customerRepository.getRepository();

    // Tạo customer code tự động
    const mktCustomerCode =
      await this.customerCodeService.generateUniqueCustomerCode(true);

    // Create initial linked account for MKT Server
    const linkedAccount: LinkedAccount = {
      id: uuidv4(),
      provider: ACCOUNT_PROVIDER.MKT_SERVER,
      externalId: mktAccountId,
      email: person.emails?.primaryEmail ?? null,
      displayName:
        [person.name?.firstName, person.name?.lastName]
          .filter(Boolean)
          .join(' ') || null,
      isPrimary: true,
      status: LINKED_ACCOUNT_STATUS.ACTIVE,
      linkedAt: DateTimeUtils.toISO(DateTimeUtils.now()),
    };

    const customerData: Partial<MktCustomerWorkspaceEntity> = {
      mktCustomerCode,
      linkedAccounts: [linkedAccount],
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
