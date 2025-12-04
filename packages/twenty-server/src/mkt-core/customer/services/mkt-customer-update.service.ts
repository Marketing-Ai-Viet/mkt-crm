import { Injectable, Logger } from '@nestjs/common';

import { PersonWorkspaceEntity } from 'src/modules/person/standard-objects/person.workspace-entity';
import { MktRepositoryService } from 'src/mkt-core/common/service/mkt-repository.service';
import { MktCustomerWorkspaceEntity } from 'src/mkt-core/customer/objects/mkt-customer.workspace-entity';

@Injectable()
export class MktCustomerUpdateService {
  private readonly logger = new Logger(MktCustomerUpdateService.name);

  constructor(private readonly mktRepo: MktRepositoryService) {}

  async updateFromPerson(
    userId: string,
    person: PersonWorkspaceEntity,
  ): Promise<void> {
    const repo = await this.mktRepo.getCustomerRepository();
    const customer = await repo.findOne({ where: { userId } });

    if (!customer) {
      this.logger.warn(
        `Customer not found for userId: ${userId}, email: ${person.emails?.primaryEmail}`,
      );

      return;
    }

    const updateData = this.buildUpdateData(person);
    const needsUpdate = this.needsUpdate(customer, updateData);

    if (!needsUpdate) {
      this.logger.log(
        `No update needed for customer: ${person.emails?.primaryEmail}`,
      );

      return;
    }

    this.logChanges(customer, updateData, person.emails?.primaryEmail);

    await repo.update({ id: customer.id }, updateData);

    this.logger.log(
      `Successfully updated customer for: ${person.emails?.primaryEmail}`,
    );
  }

  private buildUpdateData(
    person: PersonWorkspaceEntity,
  ): Partial<MktCustomerWorkspaceEntity> {
    const updateData: Partial<MktCustomerWorkspaceEntity> = {};

    if (person.name?.firstName || person.name?.lastName) {
      const fullName = [person.name.firstName, person.name.lastName]
        .filter(Boolean)
        .join(' ');

      if (fullName) {
        updateData.name = fullName;
      }
    }

    const userEmail = person.newEmail || person.emails?.primaryEmail;

    if (userEmail) {
      updateData.email = userEmail;
    }

    if (person.phones?.primaryPhoneNumber) {
      updateData.phone = person.phones.primaryPhoneNumber;
    }

    if (person.company?.name) {
      updateData.companyName = person.company.name;
    }

    return updateData;
  }

  private needsUpdate(
    customer: MktCustomerWorkspaceEntity,
    updateData: Partial<MktCustomerWorkspaceEntity>,
  ): boolean {
    return (
      (updateData.name !== undefined && customer.name !== updateData.name) ||
      (updateData.email !== undefined && customer.email !== updateData.email) ||
      (updateData.phone !== undefined && customer.phone !== updateData.phone) ||
      (updateData.companyName !== undefined &&
        customer.companyName !== updateData.companyName)
    );
  }

  private logChanges(
    customer: MktCustomerWorkspaceEntity,
    updateData: Partial<MktCustomerWorkspaceEntity>,
    email?: string,
  ): void {
    const changes: string[] = [];

    if (updateData.name !== undefined && customer.name !== updateData.name) {
      changes.push(`name: ${customer.name} → ${updateData.name}`);
    }

    if (updateData.email !== undefined && customer.email !== updateData.email) {
      changes.push(`email: ${customer.email} → ${updateData.email}`);
    }

    if (updateData.phone !== undefined && customer.phone !== updateData.phone) {
      changes.push(`phone: ${customer.phone} → ${updateData.phone}`);
    }

    if (
      updateData.companyName !== undefined &&
      customer.companyName !== updateData.companyName
    ) {
      changes.push(
        `companyName: ${customer.companyName} → ${updateData.companyName}`,
      );
    }

    if (changes.length > 0) {
      this.logger.log(
        `Updating customer ${email || customer.email}: ${changes.join(', ')}`,
      );
    }
  }
}
