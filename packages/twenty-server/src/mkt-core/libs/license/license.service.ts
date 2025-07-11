import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { CreateLicenseInput } from './dto/create-license.input';
import { UpdateLicenseInput } from './dto/update-license.input';
import { LicenseStatusHistory } from './entities/license-status-history.entity';
import { License, LicenseStatus } from './entities/license.entity';

@Injectable()
export class LicenseService {
  constructor(
    @InjectRepository(License)
    private readonly licenseRepo: Repository<License>,
  ) {}

  async create(input: CreateLicenseInput): Promise<License> {
    const license = this.licenseRepo.create(input);
    return this.licenseRepo.save(license);
  }

  async findAll(): Promise<License[]> {
    return this.licenseRepo.find();
  }

  async findByCode(licenseCode: string): Promise<License | null> {
    return this.licenseRepo.findOne({ where: { licenseCode } });
  }

  async update(input: UpdateLicenseInput): Promise<License> {
    const license = await this.licenseRepo.findOneOrFail({
      where: { id: input.id },
    });
    const oldStatus = license.status;
    Object.assign(license, input);
    const updated = await this.licenseRepo.save(license);

    // Nếu status thay đổi thì ghi log
    if (input.status && input.status !== oldStatus) {
      const history = new LicenseStatusHistory();
      history.license = license;
      history.status = input.status;
      history.changedAt = new Date();
      history.changedBy = 'system'; // hoặc từ user context
      await this.licenseRepo.manager.save(history);
    }
    return updated;
  }

  /*
   * Chạy lúc 1h sáng mỗi ngày
   * Ghi lịch sử thay đổi trạng thái
   * Tự động chuyển license từ ACTIVE → EXPIRED nếu đã quá hạn
   */

  @Cron('0 1 * * *') // chạy 1h mỗi ngày
  async autoExpireLicenses() {
    const now = new Date();
    const licenses = await this.licenseRepo.find({
      where: {
        status: LicenseStatus.ACTIVE,
        expiredAt: LessThan(now),
      },
    });

    for (const lic of licenses) {
      lic.status = LicenseStatus.EXPIRED;
      await this.licenseRepo.save(lic);

      const history = new LicenseStatusHistory();
      history.license = lic;
      history.status = LicenseStatus.EXPIRED;
      history.changedAt = new Date();
      history.changedBy = 'cronjob';
      await this.licenseRepo.manager.save(history);
    }
  }
}
