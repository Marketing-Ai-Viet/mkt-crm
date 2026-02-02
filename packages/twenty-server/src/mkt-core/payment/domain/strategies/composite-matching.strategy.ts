/**
 * Composite Matching Strategy
 *
 * Orchestrates multiple matching strategies in priority order.
 * Implements Chain of Responsibility pattern.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';

import {
  IMatchingStrategy,
  MatchContext,
  MatchResult,
  createNoMatchResult,
} from 'src/mkt-core/payment/domain/ports';
import {
  MATCH_TYPE,
  TransferModeConfig,
  DEFAULT_TRANSFER_MODE_CONFIG,
} from 'src/mkt-core/payment/domain/value-objects';

import { VAMatchingStrategy } from './va-matching.strategy';
import { CodeMatchingStrategy } from './code-matching.strategy';
import { FuzzyMatchingStrategy } from './fuzzy-matching.strategy';

export const TRANSFER_MODE_CONFIG_TOKEN = Symbol('TransferModeConfig');

@Injectable()
export class CompositeMatchingStrategy {
  private strategies: IMatchingStrategy[] = [];
  private readonly logger = new Logger(CompositeMatchingStrategy.name);
  private readonly config: TransferModeConfig;

  constructor(
    @Optional() private readonly vaStrategy: VAMatchingStrategy | null,
    private readonly codeStrategy: CodeMatchingStrategy,
    @Optional() private readonly fuzzyStrategy: FuzzyMatchingStrategy | null,
    @Optional()
    @Inject(TRANSFER_MODE_CONFIG_TOKEN)
    config?: TransferModeConfig,
  ) {
    this.config = config ?? DEFAULT_TRANSFER_MODE_CONFIG;
    this.initStrategies();
  }

  /**
   * Initialize strategies based on configuration
   */
  private initStrategies(): void {
    this.strategies = [];

    // Add VA strategy if enabled
    if (this.config.va.enabled && this.vaStrategy) {
      this.strategies.push(this.vaStrategy);
      this.logger.log('VA matching strategy enabled');
    }

    // Add code strategy if regular mode enabled
    if (this.config.regular.enabled) {
      this.strategies.push(this.codeStrategy);
      this.logger.log('Code matching strategy enabled');

      // Add fuzzy strategy if enabled
      if (this.config.regular.enableFuzzyMatch && this.fuzzyStrategy) {
        this.strategies.push(this.fuzzyStrategy);
        this.logger.log('Fuzzy matching strategy enabled');
      }
    }

    // Sort by priority
    this.strategies.sort((a, b) => a.priority - b.priority);

    this.logger.log(
      `Initialized ${this.strategies.length} matching strategies: ${this.strategies.map((s) => s.name).join(', ')}`,
    );
  }

  /**
   * Execute matching using all strategies in priority order
   *
   * @param context - Match context
   * @returns Match result from first successful strategy
   */
  async match(context: MatchContext): Promise<MatchResult> {
    this.logger.debug(
      `Starting composite match for transaction: ${context.transactionId}`,
    );

    for (const strategy of this.strategies) {
      if (!strategy.canHandle(context)) {
        this.logger.debug(`Strategy ${strategy.name} cannot handle context`);
        continue;
      }

      this.logger.debug(`Trying strategy: ${strategy.name}`);

      const result = await strategy.match(context);

      if (result.matched) {
        this.logger.log(
          `Match found by ${strategy.name}: ${result.orderCode} (confidence: ${result.confidence})`,
        );

        return result;
      }

      // If fuzzy suggests manual review, return it
      if (result.details?.requiresManualReview) {
        this.logger.log(`Manual review suggested by ${strategy.name}`);

        return result;
      }

      this.logger.debug(
        `Strategy ${strategy.name} did not match: ${result.details?.reason ?? 'unknown'}`,
      );
    }

    this.logger.warn(
      `No strategy matched for transaction: ${context.transactionId}`,
    );

    return createNoMatchResult(MATCH_TYPE.MANUAL, 'NO_STRATEGY_MATCHED');
  }

  /**
   * Get list of enabled strategies
   */
  getEnabledStrategies(): IMatchingStrategy[] {
    return [...this.strategies];
  }

  /**
   * Get current configuration
   */
  getConfig(): TransferModeConfig {
    return { ...this.config };
  }

  /**
   * Reload strategies with new configuration
   * Useful for runtime configuration changes
   */
  reloadStrategies(newConfig: TransferModeConfig): void {
    (this as unknown as { config: TransferModeConfig }).config = newConfig;
    this.initStrategies();
  }
}
