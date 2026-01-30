import { Command, CommandRunner } from 'nest-commander';

import { MktProductSyncService } from 'src/mkt-core/mkt-product-integration/services';

/**
 * CLI Command để trigger sync products ngay lập tức
 *
 * Usage:
 * ```bash
 * npx nx command twenty-server -- mkt-product-sync-now
 * ```
 */
@Command({
  name: 'mkt-product-sync-now',
  description: 'Trigger product sync from MKT Server immediately',
})
export class MktProductSyncNowCommand extends CommandRunner {
  constructor(private readonly syncService: MktProductSyncService) {
    super();
  }

  async run(): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('🔄 Starting product sync from MKT Server...');

    try {
      const result = await this.syncService.syncAllProductsAndPackages();

      // eslint-disable-next-line no-console
      console.log('✅ Sync completed:');
      // eslint-disable-next-line no-console
      console.log(`   - Products: ${result.productsCount}`);
      // eslint-disable-next-line no-console
      console.log(`   - Packages: ${result.packagesCount}`);
      // eslint-disable-next-line no-console
      console.log(`   - Duration: ${result.duration}ms`);

      if (result.errors.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`   - Errors: ${result.errors.length}`);
        result.errors.forEach((err, i) => {
          // eslint-disable-next-line no-console
          console.warn(`     ${i + 1}. ${err}`);
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
        '❌ Sync failed:',
        error instanceof Error ? error.message : error,
      );
      process.exit(1);
    }
  }
}
