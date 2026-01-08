import { Injectable, Logger } from '@nestjs/common';

import isEmpty from 'lodash.isempty';
import isNil from 'lodash.isnil';
import omitBy from 'lodash.omitby';
import pickBy from 'lodash.pickby';

import { ACCOUNT_PROVIDER } from 'src/mkt-core/customer/constants';
import { CUSTOMER_MESSAGES } from 'src/mkt-core/customer/messages';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';
import { MktCustomerRepository } from 'src/mkt-core/customer/repositories/mkt-customer.repository';
import { CustomerUpdateFields } from 'src/mkt-core/customer/types';
import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';

@Injectable()
export class MktCustomerUpdateService {
  private readonly logger = new Logger(MktCustomerUpdateService.name);

  constructor(private readonly customerRepository: MktCustomerRepository) {}

  async updateFromPerson(
    mktAccountId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    const repo = await this.customerRepository.getRepository();
    // Find customer by linked MKT Server account in linkedAccounts JSONB array
    const customer = await this.customerRepository.findByLinkedAccount(
      ACCOUNT_PROVIDER.MKT_SERVER,
      mktAccountId,
    );
    const email = person.emails?.primaryEmail;

    if (!customer) {
      this.logger.warn(
        CUSTOMER_MESSAGES.WARN.CUSTOMER_NOT_FOUND_BY_MKT_ACCOUNT(
          mktAccountId,
          email,
        ),
      );

      return;
    }

    const updateData = this.buildUpdateData(person);
    const changedFields = this.getChangedFields(customer, updateData);

    if (isEmpty(changedFields)) {
      this.logger.log(CUSTOMER_MESSAGES.LOG.UPDATE_NO_CHANGES(email || ''));

      return;
    }

    const changesLog = this.formatChanges(customer, changedFields);

    this.logger.log(
      CUSTOMER_MESSAGES.LOG.UPDATE_CHANGES(email || customer.email, changesLog),
    );

    await repo.update({ id: customer.id }, changedFields as never);

    this.logger.log(CUSTOMER_MESSAGES.LOG.UPDATE_SUCCESS(email || ''));
  }

  private buildUpdateData(
    person: PersonWorkspaceEntity,
  ): Partial<CustomerUpdateFields> {
    const fullName = [person.name?.firstName, person.name?.lastName]
      .filter(Boolean)
      .join(' ');

    const rawData: Partial<CustomerUpdateFields> = {
      name: fullName || undefined,
      email: person.newEmail || person.emails?.primaryEmail,
      phone: person.phones?.primaryPhoneNumber,
      companyName: person.company?.name,
    };

    return omitBy(rawData, isNil);
  }

  private getChangedFields(
    customer: MktCustomerWorkspaceEntity,
    updateData: Partial<CustomerUpdateFields>,
  ): Partial<CustomerUpdateFields> {
    return pickBy(
      updateData,
      (value, key) => value !== customer[key as keyof CustomerUpdateFields],
    );
  }

  private formatChanges(
    customer: MktCustomerWorkspaceEntity,
    changedFields: Partial<CustomerUpdateFields>,
  ): string {
    return Object.entries(changedFields)
      .map(
        ([key, newValue]) =>
          `${key}: ${customer[key as keyof CustomerUpdateFields]} → ${newValue}`,
      )
      .join(', ');
  }
}
