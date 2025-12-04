import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { RoleEntity } from 'src/engine/metadata-modules/role/role.entity';

@Injectable()
export class MktRoleCacheService {
  private readonly logger = new Logger(MktRoleCacheService.name);
  private saleRoleId: string | null = null;
  private supportRoleId: string | null = null;
  private accountantRoleId: string | null = null;
  private customerRoleId: string | null = null;

  constructor(
    @InjectRepository(RoleEntity, 'core')
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async initializeRoles(): Promise<void> {
    const roleEntities = await this.roleRepository
      .createQueryBuilder('role')
      .where('role.label IN (:...labels)', {
        labels: ['Sales', 'Support', 'Accountant', 'Customer'],
      })
      .getMany();

    for (const roleEntity of roleEntities) {
      if (roleEntity.label === 'Sales') {
        this.saleRoleId = roleEntity.id;
      } else if (roleEntity.label === 'Support') {
        this.supportRoleId = roleEntity.id;
      } else if (roleEntity.label === 'Accountant') {
        this.accountantRoleId = roleEntity.id;
      } else if (roleEntity.label === 'Customer') {
        this.customerRoleId = roleEntity.id;
      }
    }

    this.logger.log(
      `Initialized roles - Sales: ${this.saleRoleId}, Support: ${this.supportRoleId}, Accountant: ${this.accountantRoleId}, Customer: ${this.customerRoleId}`,
    );
  }

  getRoleIdByMemberType(memberType: string): string | null {
    switch (memberType) {
      case 'SALES':
        return this.saleRoleId;
      case 'SUPPORT':
        return this.supportRoleId;
      case 'ACCOUNTANT':
        return this.accountantRoleId;
      case 'CUSTOMER':
        return this.customerRoleId;
      default:
        return null;
    }
  }

  getSaleRoleId(): string | null {
    return this.saleRoleId;
  }

  getSupportRoleId(): string | null {
    return this.supportRoleId;
  }

  getAccountantRoleId(): string | null {
    return this.accountantRoleId;
  }

  getCustomerRoleId(): string | null {
    return this.customerRoleId;
  }
}
