import 'dotenv/config';
import { DataSource } from 'typeorm';
import dataSource from '../../../data-source'; // Đường dẫn tới file DataSource của bạn
import { License, LicenseStatus } from '../entities/license.entity';

const seedLicenses = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(License);
  const sample = repo.create({
    licenseCode: 'LIC-2025-001234',
    orderCode: 'ORDER-7890',
    productName: 'MKT Care Pro v2.1',
    customerEmail: 'user@example.com',
    customerName: 'Nguyễn Văn A',
    customerContact: '0909xxxxxx',
    status: LicenseStatus.ACTIVE,
    activatedAt: new Date(),
    expiredAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
    saleInCharge: 'sale01',
    supportInCharge: 'support01',
    assignedAt: new Date(),
    currentVersion: 'v2.1',
    internalNote: 'Khách VIP',
  });

  await repo.save(sample);
  console.log('🌱 Seeded 1 license');
};

// Tự chạy khi gọi bằng CLI
async function main() {
  try {
    await dataSource.initialize();
    console.log('✅ Database connected');
    await seedLicenses(dataSource);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await dataSource.destroy();
    console.log('🧹 Connection closed');
  }
}

main();
