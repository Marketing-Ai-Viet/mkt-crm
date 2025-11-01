import { Logger } from '@nestjs/common';

import { Command, CommandRunner } from 'nest-commander';

import { MktLicenseDashboardStatsRegistrationService } from 'src/mkt-core/license/services/mkt-license-dashboard-stats-registration.service';

@Command({
  name: 'cron:register:mkt',
  description: 'Register mkt background sync cron jobs',
})
export class MktCronRegisterCommand extends CommandRunner {
  private readonly logger = new Logger(MktCronRegisterCommand.name);

  constructor(
    private readonly mktLicenseDashboardStatsRegistrationService: MktLicenseDashboardStatsRegistrationService,
  ) {
    super();
  }

  async run(): Promise<void> {
    this.logger.log('Registering all background sync cron jobs...');

    const commands = [
      {
        name: 'CronLicenseStats',
        command: this.mktLicenseDashboardStatsRegistrationService,
      },
    ];

    let successCount = 0;
    let failureCount = 0;
    const failures: string[] = [];
    const successes: string[] = [];

    for (const { name, command } of commands) {
      try {
        this.logger.log(`Registering ${name} cron job...`);
        await command.register();
        this.logger.log(`Successfully registered ${name} cron job`);
        successCount++;
        successes.push(name);
      } catch (error) {
        this.logger.error(`Failed to register ${name} cron job:`, error);
        failureCount++;
        failures.push(name);
      }
    }

    this.logger.log(
      `Cron job registration completed: ${successCount} successful, ${failureCount} failed`,
    );

    if (failures.length > 0) {
      this.logger.warn(`Failed commands: ${failures.join(', ')}`);
    }

    if (successCount > 0) {
      this.logger.log(`Successful commands: ${successes.join(', ')}`);
    }
  }
}
