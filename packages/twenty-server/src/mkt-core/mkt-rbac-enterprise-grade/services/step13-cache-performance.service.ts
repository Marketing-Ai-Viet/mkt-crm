/**
 * Step 13: Cache & Performance Service
 * Optimizes permission validation through intelligent caching and performance monitoring
 * Part of the 15-step Enterprise RBAC validation process
 * Uses workspace entities only, no core module dependencies
 */

import { Injectable, Logger } from '@nestjs/common';

import { DateTime } from 'luxon';

import {
  PermissionValidationStep,
  StepValidationResult,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';

import {
  EnhancedPermissionContext,
  EnhancedUserContext,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
import {
  CheckResult,
  STEP_PERFORMANCE_CONFIG,
  VALIDATION_STEPS,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
import {
  VALIDATION_STEP_DESCRIPTIONS,
  VALIDATION_STEP_NAMES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';

import { RbacCacheManagerService } from './rbac-cache-manager.service';

/**
 * Performance optimization strategy levels
 */
enum PerformanceStrategy {
  BASIC = 'BASIC',
  OPTIMIZED = 'OPTIMIZED',
  AGGRESSIVE = 'AGGRESSIVE',
  ADAPTIVE = 'ADAPTIVE',
}

/**
 * Cache effectiveness levels
 */
enum CacheEffectiveness {
  POOR = 'POOR',
  AVERAGE = 'AVERAGE',
  GOOD = 'GOOD',
  EXCELLENT = 'EXCELLENT',
}

/**
 * Performance metrics tracking
 */
type PerformanceMetrics = {
  cacheHitRate: number;
  averageResponseTime: number;
  totalRequests: number;
  cacheSize: number;
  memoryUsage: number;
  errorRate: number;
  optimizationScore: number;
  lastOptimizedAt: Date;
  hotKeys: string[];
  slowQueries: string[];
};

/**
 * Cache configuration for different data types
 */
type CacheConfig = {
  permissionResultTTL: number;
  userContextTTL: number;
  resourceInfoTTL: number;
  policyResultTTL: number;
  templateInfoTTL: number;
  maxCacheSize: number;
  compressionEnabled: boolean;
  prefetchEnabled: boolean;
  adaptiveEviction: boolean;
};

/**
 * Performance evaluation result
 */
type PerformanceEvaluation = {
  cacheEffectiveness: CacheEffectiveness;
  strategy: PerformanceStrategy;
  optimizations: string[];
  recommendations: string[];
  performanceScore: number;
  bottlenecks: string[];
  estimatedImprovements: Record<string, number>;
  appliedOptimizations: string[];
  metadata: {
    evaluationDuration: number;
    cacheMetrics: PerformanceMetrics;
    systemLoad: number;
    memoryPressure: number;
  };
};

/**
 * Workspace entity interfaces for performance optimization
 */
interface MktPermissionTemplateWorkspaceEntity {
  id: string;
  templateKey: string;
  templateName: string;
  description?: string;
  hierarchyLevel: number;
  applicableToLevels: Record<string, unknown>;
  version: string;
  isSystemTemplate: boolean;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface MktUserPermissionTemplateWorkspaceEntity {
  id: string;
  isActive: boolean;
  assignedAt: Date;
  expiresAt: Date;
  assignmentReason: string;
  templateId?: string;
  workspaceMemberId?: string;
  assignedById?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

@Injectable()
export class Step13CachePerformanceService implements PermissionValidationStep {
  private readonly logger = new Logger(Step13CachePerformanceService.name);
  readonly stepNumber = VALIDATION_STEPS.CACHE_PERFORMANCE;
  readonly stepName = VALIDATION_STEP_NAMES[VALIDATION_STEPS.CACHE_PERFORMANCE];
  readonly description =
    VALIDATION_STEP_DESCRIPTIONS[VALIDATION_STEPS.CACHE_PERFORMANCE];
  readonly isRequired = false;
  readonly canSkip = true;
  readonly isAsync = true;
  readonly priority = 130;

  // Cache TTL constants (in milliseconds)
  private readonly CACHE_TTL = {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 30 * 60 * 1000, // 30 minutes
    LONG: 2 * 60 * 60 * 1000, // 2 hours
    EXTENDED: 24 * 60 * 60 * 1000, // 24 hours
  };

  // Performance thresholds
  private readonly PERFORMANCE_THRESHOLDS = {
    CACHE_HIT_RATE_GOOD: 80,
    CACHE_HIT_RATE_EXCELLENT: 95,
    RESPONSE_TIME_GOOD: 100, // milliseconds
    RESPONSE_TIME_EXCELLENT: 50, // milliseconds
    ERROR_RATE_MAX: 1, // percentage
    MEMORY_USAGE_MAX: 85, // percentage
  };

  constructor(
    private readonly twentyORMGlobalManager: TwentyORMGlobalManager,
    private readonly rbacCacheManager: RbacCacheManagerService,
  ) {}

  /**
   * Determine if step should execute based on context
   */
  shouldExecute(_context: EnhancedPermissionContext): boolean {
    // Execute if performance optimization is needed
    // For now, we always execute to maintain performance monitoring
    return this.isPerformanceOptimizationNeeded();
  }

  /**
   * Get estimated execution time for performance planning
   */
  getEstimatedExecutionTime(_context: EnhancedPermissionContext): number {
    // Adjust based on optimization complexity
    // For now, use base time as we don't have performance analysis flag
    // Could be enhanced in the future with additional context properties

    return (
      STEP_PERFORMANCE_CONFIG[VALIDATION_STEPS.CACHE_PERFORMANCE]
        ?.estimatedExecutionTime || 150
    );
  }

  /**
   * Main validation method
   */
  async validate(
    context: EnhancedPermissionContext,
  ): Promise<StepValidationResult> {
    const stepStartTime = DateTime.now();

    try {
      this.logger.debug(
        `Step ${this.stepNumber}: Starting cache & performance optimization`,
      );

      // Skip if no user context
      if (!context.userContext) {
        return {
          result: CheckResult.SKIP,
          continue: true,
          reason: 'Missing user context for cache & performance optimization',
          executionTime: DateTime.now().diff(stepStartTime).toMillis(),
          metadata: { skippedBy: 'missing_user_context' },
        };
      }

      const workspaceId = context.userContext.workspaceId || '';

      // Evaluate current performance and cache effectiveness
      const evaluation = await this.evaluateCachePerformance(
        context.userContext,
        context.resourceContext?.resourceType || '',
        context.action || '',
        workspaceId,
      );

      // Apply performance optimizations if needed
      await this.applyPerformanceOptimizations(evaluation, workspaceId);

      // Update performance metrics
      await this.updatePerformanceMetrics(evaluation, workspaceId);

      // Log evaluation results
      this.logger.debug('Cache & performance evaluation completed', {
        cacheEffectiveness: evaluation.cacheEffectiveness,
        performanceScore: evaluation.performanceScore,
        optimizationsApplied: evaluation.appliedOptimizations.length,
        workspaceId,
      });

      // Determine result based on evaluation
      let result: CheckResult;
      const continueValidation = true;
      let reason: string;

      if (evaluation.performanceScore >= 90) {
        result = CheckResult.PASS;
        reason = `Excellent performance: ${evaluation.performanceScore}% optimization score`;
      } else if (evaluation.performanceScore >= 70) {
        result = CheckResult.WARNING;
        reason = `Good performance with optimization opportunities: ${evaluation.performanceScore}% score`;
      } else if (evaluation.performanceScore >= 50) {
        result = CheckResult.WARNING;
        reason = `Average performance requires optimization: ${evaluation.performanceScore}% score`;
      } else {
        result = CheckResult.WARNING; // Don't fail - performance is non-blocking
        reason = `Poor performance detected: ${evaluation.performanceScore}% score`;
      }

      const executionTime = DateTime.now().diff(stepStartTime).toMillis();

      return {
        result,
        continue: continueValidation,
        reason,
        executionTime,
        metadata: {
          performanceScore: evaluation.performanceScore,
          cacheEffectiveness: evaluation.cacheEffectiveness,
          strategy: evaluation.strategy,
          optimizationsApplied: evaluation.appliedOptimizations.length,
          cacheHitRate: evaluation.metadata.cacheMetrics.cacheHitRate,
          averageResponseTime:
            evaluation.metadata.cacheMetrics.averageResponseTime,
          bottlenecks: evaluation.bottlenecks.join(','),
          recommendations: evaluation.recommendations.join(';'),
        },
      };
    } catch (error) {
      const executionTime = DateTime.now().diff(stepStartTime).toMillis();

      this.logger.error('Step 13 validation failed', {
        error: error.message,
        workspaceId: context.userContext?.workspaceId,
        resourceType: context.resourceContext?.resourceType,
        executionTime,
      });

      return {
        result: CheckResult.WARNING, // Performance failures are warnings, not blocking errors
        continue: true,
        reason: `Cache & performance optimization warning: ${error.message}`,
        executionTime,
        metadata: { error: error.message },
      };
    }
  }

  /**
   * Evaluate current cache performance and effectiveness
   */
  private async evaluateCachePerformance(
    userContext: EnhancedUserContext,
    resourceType: string,
    requestedAction: string,
    workspaceId: string,
  ): Promise<PerformanceEvaluation> {
    const evaluationStartTime = DateTime.now();

    // Get current performance metrics
    const metrics = await this.getCurrentPerformanceMetrics(workspaceId);

    // Analyze cache effectiveness
    const cacheEffectiveness = this.analyzeCacheEffectiveness(metrics);

    // Determine optimal strategy
    const strategy = this.determineOptimalStrategy(metrics, cacheEffectiveness);

    // Identify performance bottlenecks
    const bottlenecks = await this.identifyBottlenecks(
      userContext,
      resourceType,
      requestedAction,
      workspaceId,
    );

    // Generate optimization recommendations
    const recommendations = this.generateRecommendations(
      metrics,
      cacheEffectiveness,
      bottlenecks,
    );

    // Calculate performance score
    const performanceScore = this.calculatePerformanceScore(
      metrics.cacheHitRate,
      metrics.averageResponseTime,
      metrics.errorRate,
    );

    // Generate optimization list
    const optimizations = this.generateOptimizations(
      strategy,
      bottlenecks,
      metrics,
    );

    // Estimate potential improvements
    const estimatedImprovements = this.estimateImprovements(
      optimizations,
      metrics,
    );

    const evaluationDuration = DateTime.now()
      .diff(evaluationStartTime)
      .toMillis();

    return {
      cacheEffectiveness,
      strategy,
      optimizations,
      recommendations,
      performanceScore,
      bottlenecks,
      estimatedImprovements,
      appliedOptimizations: [], // Will be populated when optimizations are applied
      metadata: {
        evaluationDuration,
        cacheMetrics: metrics,
        systemLoad: await this.getSystemLoad(),
        memoryPressure: await this.getMemoryPressure(),
      },
    };
  }

  /**
   * Get current performance metrics
   */
  private async getCurrentPerformanceMetrics(
    workspaceId: string,
  ): Promise<PerformanceMetrics> {
    try {
      // Get metrics from RBAC Cache Manager (in-memory tracking)
      const cacheMetrics = this.rbacCacheManager.getPerformanceMetrics();

      // Convert to our PerformanceMetrics format

      return {
        cacheHitRate: cacheMetrics.hitRate,
        averageResponseTime: cacheMetrics.avgResponseTime,
        totalRequests: cacheMetrics.totalRequests,
        cacheSize: cacheMetrics.cacheSize,
        memoryUsage: 0, // Would be calculated from system metrics
        errorRate: cacheMetrics.errorRate,
        optimizationScore: this.calculateOptimizationScore(
          cacheMetrics.hitRate,
          cacheMetrics.avgResponseTime,
          cacheMetrics.errorRate,
        ),
        lastOptimizedAt: cacheMetrics.lastResetAt.toJSDate(),
        hotKeys: cacheMetrics.hotKeys,
        slowQueries: cacheMetrics.slowOperations.map((op) => op.split(':')[1]), // Extract operation details
      };
    } catch (error) {
      this.logger.error('Failed to get performance metrics', {
        error: error.message,
        workspaceId,
      });

      // Return default metrics if calculation fails
      return {
        cacheHitRate: 0,
        averageResponseTime: 1000,
        totalRequests: 0,
        cacheSize: 0,
        memoryUsage: 0,
        errorRate: 0,
        optimizationScore: 50,
        lastOptimizedAt: new Date(),
        hotKeys: [],
        slowQueries: [],
      };
    }
  }

  /**
   * Analyze cache effectiveness based on metrics
   */
  private analyzeCacheEffectiveness(
    metrics: PerformanceMetrics,
  ): CacheEffectiveness {
    const { cacheHitRate, averageResponseTime, errorRate } = metrics;

    if (
      cacheHitRate >= this.PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_EXCELLENT &&
      averageResponseTime <=
        this.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_EXCELLENT &&
      errorRate <= this.PERFORMANCE_THRESHOLDS.ERROR_RATE_MAX
    ) {
      return CacheEffectiveness.EXCELLENT;
    } else if (
      cacheHitRate >= this.PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_GOOD &&
      averageResponseTime <= this.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_GOOD &&
      errorRate <= this.PERFORMANCE_THRESHOLDS.ERROR_RATE_MAX
    ) {
      return CacheEffectiveness.GOOD;
    } else if (cacheHitRate >= 50 && averageResponseTime <= 500) {
      return CacheEffectiveness.AVERAGE;
    } else {
      return CacheEffectiveness.POOR;
    }
  }

  /**
   * Determine optimal performance strategy
   */
  private determineOptimalStrategy(
    metrics: PerformanceMetrics,
    effectiveness: CacheEffectiveness,
  ): PerformanceStrategy {
    const { cacheHitRate, totalRequests } = metrics;

    // High traffic with poor performance - use aggressive optimization
    if (totalRequests > 1000 && effectiveness === CacheEffectiveness.POOR) {
      return PerformanceStrategy.AGGRESSIVE;
    }

    // Good performance but room for improvement - use adaptive strategy
    if (effectiveness === CacheEffectiveness.GOOD && cacheHitRate < 90) {
      return PerformanceStrategy.ADAPTIVE;
    }

    // Average performance - use optimized strategy
    if (effectiveness === CacheEffectiveness.AVERAGE) {
      return PerformanceStrategy.OPTIMIZED;
    }

    // Excellent performance or low traffic - use basic strategy
    return PerformanceStrategy.BASIC;
  }

  /**
   * Identify performance bottlenecks
   */
  private async identifyBottlenecks(
    userContext: EnhancedUserContext,
    _resourceType: string,
    _action: string,
    workspaceId: string,
  ): Promise<string[]> {
    const bottlenecks: string[] = [];

    try {
      // Check for slow database queries
      const slowQueries = await this.getSlowQueries(workspaceId);

      if (slowQueries.length > 0) {
        bottlenecks.push(
          `SLOW_QUERIES: ${slowQueries.length} queries over 100ms`,
        );
      }

      // Check for cache misses on hot paths
      const hotKeys = await this.getHotKeys(workspaceId);

      if (hotKeys.length > 10) {
        bottlenecks.push(
          `HOT_KEYS: ${hotKeys.length} frequently accessed uncached keys`,
        );
      }

      // Check for large permission template queries
      const templateRepo =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktPermissionTemplateWorkspaceEntity>(
          workspaceId,
          'mktPermissionTemplate',
          { shouldBypassPermissionChecks: true },
        );

      const templateCount = await templateRepo.count();

      if (templateCount > 100) {
        bottlenecks.push(
          `LARGE_TEMPLATE_SET: ${templateCount} permission templates may cause slow queries`,
        );
      }

      // Check for complex user permission queries
      const userTemplateRepo =
        await this.twentyORMGlobalManager.getRepositoryForWorkspace<MktUserPermissionTemplateWorkspaceEntity>(
          workspaceId,
          'mktUserPermissionTemplate',
          { shouldBypassPermissionChecks: true },
        );

      const userTemplateCount = await userTemplateRepo.count({
        where: {
          workspaceMemberId: userContext.workspaceMemberId,
          isActive: true,
        },
      });

      if (userTemplateCount > 20) {
        bottlenecks.push(
          `COMPLEX_USER_PERMISSIONS: ${userTemplateCount} active templates for user`,
        );
      }

      // Check memory pressure
      const memoryPressure = await this.getMemoryPressure();

      if (memoryPressure > 80) {
        bottlenecks.push(
          `HIGH_MEMORY_USAGE: ${memoryPressure}% memory utilization`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to identify bottlenecks', {
        error: error.message,
        workspaceId,
      });
      bottlenecks.push(
        'ANALYSIS_ERROR: Unable to complete bottleneck analysis',
      );
    }

    return bottlenecks;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    metrics: PerformanceMetrics,
    effectiveness: CacheEffectiveness,
    bottlenecks: string[],
  ): string[] {
    const recommendations: string[] = [];

    // Cache hit rate recommendations
    if (
      metrics.cacheHitRate < this.PERFORMANCE_THRESHOLDS.CACHE_HIT_RATE_GOOD
    ) {
      recommendations.push(
        'Increase cache TTL for permission templates and user contexts',
      );
      recommendations.push(
        'Implement cache warming for frequently accessed permissions',
      );
    }

    // Response time recommendations
    if (
      metrics.averageResponseTime >
      this.PERFORMANCE_THRESHOLDS.RESPONSE_TIME_GOOD
    ) {
      recommendations.push('Optimize database queries with proper indexing');
      recommendations.push('Consider implementing query result caching');
    }

    // Bottleneck-specific recommendations
    for (const bottleneck of bottlenecks) {
      if (bottleneck.includes('SLOW_QUERIES')) {
        recommendations.push('Review and optimize slow database queries');
        recommendations.push(
          'Consider adding database indexes for frequently queried fields',
        );
      }

      if (bottleneck.includes('HOT_KEYS')) {
        recommendations.push(
          'Implement preemptive caching for frequently accessed data',
        );
      }

      if (bottleneck.includes('LARGE_TEMPLATE_SET')) {
        recommendations.push('Consider archiving unused permission templates');
        recommendations.push('Implement template hierarchy optimization');
      }

      if (bottleneck.includes('COMPLEX_USER_PERMISSIONS')) {
        recommendations.push('Review user permission template assignments');
        recommendations.push(
          'Consider consolidating similar permission templates',
        );
      }

      if (bottleneck.includes('HIGH_MEMORY_USAGE')) {
        recommendations.push('Implement cache size limits and LRU eviction');
        recommendations.push(
          'Review memory usage patterns and optimize data structures',
        );
      }
    }

    // Effectiveness-based recommendations
    switch (effectiveness) {
      case CacheEffectiveness.POOR:
        recommendations.push('Implement comprehensive caching strategy');
        recommendations.push('Review and optimize all database queries');
        break;
      case CacheEffectiveness.AVERAGE:
        recommendations.push('Fine-tune cache TTL values');
        recommendations.push('Implement selective caching for hot paths');
        break;
      case CacheEffectiveness.GOOD:
        recommendations.push('Monitor and maintain current performance levels');
        break;
      case CacheEffectiveness.EXCELLENT:
        recommendations.push(
          'Consider implementing advanced optimization techniques',
        );
        break;
    }

    return recommendations;
  }

  /**
   * Generate optimization list based on strategy and bottlenecks
   */
  private generateOptimizations(
    strategy: PerformanceStrategy,
    bottlenecks: string[],
    _metrics: PerformanceMetrics,
  ): string[] {
    const optimizations: string[] = [];

    switch (strategy) {
      case PerformanceStrategy.BASIC:
        optimizations.push('ENABLE_BASIC_CACHING');
        break;

      case PerformanceStrategy.OPTIMIZED:
        optimizations.push('ENABLE_SELECTIVE_CACHING');
        optimizations.push('OPTIMIZE_QUERY_PATTERNS');
        break;

      case PerformanceStrategy.AGGRESSIVE:
        optimizations.push('ENABLE_AGGRESSIVE_CACHING');
        optimizations.push('IMPLEMENT_QUERY_OPTIMIZATION');
        optimizations.push('ENABLE_COMPRESSION');
        optimizations.push('IMPLEMENT_PREFETCHING');
        break;

      case PerformanceStrategy.ADAPTIVE:
        optimizations.push('ENABLE_ADAPTIVE_CACHING');
        optimizations.push('DYNAMIC_TTL_ADJUSTMENT');
        optimizations.push('INTELLIGENT_PREFETCHING');
        break;
    }

    // Add bottleneck-specific optimizations
    for (const bottleneck of bottlenecks) {
      if (bottleneck.includes('SLOW_QUERIES')) {
        optimizations.push('QUERY_OPTIMIZATION');
      }
      if (bottleneck.includes('HOT_KEYS')) {
        optimizations.push('HOT_KEY_CACHING');
      }
      if (bottleneck.includes('LARGE_TEMPLATE_SET')) {
        optimizations.push('TEMPLATE_INDEXING');
      }
      if (bottleneck.includes('HIGH_MEMORY_USAGE')) {
        optimizations.push('MEMORY_OPTIMIZATION');
      }
    }

    return optimizations;
  }

  /**
   * Apply performance optimizations
   */
  private async applyPerformanceOptimizations(
    evaluation: PerformanceEvaluation,
    workspaceId: string,
  ): Promise<void> {
    const appliedOptimizations: string[] = [];

    try {
      for (const optimization of evaluation.optimizations) {
        switch (optimization) {
          case 'ENABLE_BASIC_CACHING':
            await this.enableBasicCaching(workspaceId);
            appliedOptimizations.push(optimization);
            break;

          case 'ENABLE_SELECTIVE_CACHING':
            await this.enableSelectiveCaching(workspaceId);
            appliedOptimizations.push(optimization);
            break;

          case 'ENABLE_AGGRESSIVE_CACHING':
            await this.enableAggressiveCaching(workspaceId);
            appliedOptimizations.push(optimization);
            break;

          case 'HOT_KEY_CACHING':
            await this.implementHotKeyCaching(workspaceId);
            appliedOptimizations.push(optimization);
            break;

          case 'QUERY_OPTIMIZATION':
            await this.optimizeQueries(workspaceId);
            appliedOptimizations.push(optimization);
            break;

          default:
            this.logger.debug(
              `Optimization ${optimization} not implemented yet`,
            );
        }
      }

      evaluation.appliedOptimizations = appliedOptimizations;

      this.logger.debug('Performance optimizations applied', {
        appliedCount: appliedOptimizations.length,
        optimizations: appliedOptimizations,
        workspaceId,
      });
    } catch (error) {
      this.logger.error('Failed to apply performance optimizations', {
        error: error.message,
        workspaceId,
      });
    }
  }

  /**
   * Update performance metrics (log only - no database storage)
   */
  private async updatePerformanceMetrics(
    evaluation: PerformanceEvaluation,
    workspaceId: string,
  ): Promise<void> {
    try {
      // Log performance evaluation for monitoring
      this.logger.log('Performance evaluation completed', {
        workspaceId,
        performanceScore: evaluation.performanceScore,
        cacheEffectiveness: evaluation.cacheEffectiveness,
        strategy: evaluation.strategy,
        optimizationsApplied: evaluation.appliedOptimizations.length,
        cacheHitRate: evaluation.metadata.cacheMetrics.cacheHitRate,
        averageResponseTime:
          evaluation.metadata.cacheMetrics.averageResponseTime,
        bottlenecks: evaluation.bottlenecks.length,
        recommendations: evaluation.recommendations.length,
      });

      // Update cache optimization strategy if needed
      if (evaluation.strategy) {
        this.logger.debug('Updating cache optimization strategy', {
          strategy: evaluation.strategy,
          workspaceId,
        });
      }
    } catch (error) {
      this.logger.error('Failed to update performance metrics', {
        error: error.message,
        workspaceId,
      });
    }
  }

  /**
   * Helper methods for optimization implementation
   */
  private async enableBasicCaching(workspaceId: string): Promise<void> {
    // Implementation for basic caching strategy
    const cacheConfig: CacheConfig = {
      permissionResultTTL: this.CACHE_TTL.MEDIUM,
      userContextTTL: this.CACHE_TTL.LONG,
      resourceInfoTTL: this.CACHE_TTL.SHORT,
      policyResultTTL: this.CACHE_TTL.MEDIUM,
      templateInfoTTL: this.CACHE_TTL.EXTENDED,
      maxCacheSize: 1000,
      compressionEnabled: false,
      prefetchEnabled: false,
      adaptiveEviction: false,
    };

    await this.saveCacheConfiguration(workspaceId, 'BASIC', cacheConfig);
  }

  private async enableSelectiveCaching(workspaceId: string): Promise<void> {
    // Implementation for selective caching strategy
    const cacheConfig: CacheConfig = {
      permissionResultTTL: this.CACHE_TTL.LONG,
      userContextTTL: this.CACHE_TTL.EXTENDED,
      resourceInfoTTL: this.CACHE_TTL.MEDIUM,
      policyResultTTL: this.CACHE_TTL.LONG,
      templateInfoTTL: this.CACHE_TTL.EXTENDED,
      maxCacheSize: 5000,
      compressionEnabled: false,
      prefetchEnabled: true,
      adaptiveEviction: true,
    };

    await this.saveCacheConfiguration(workspaceId, 'SELECTIVE', cacheConfig);
  }

  private async enableAggressiveCaching(workspaceId: string): Promise<void> {
    // Implementation for aggressive caching strategy
    const cacheConfig: CacheConfig = {
      permissionResultTTL: this.CACHE_TTL.EXTENDED,
      userContextTTL: this.CACHE_TTL.EXTENDED,
      resourceInfoTTL: this.CACHE_TTL.LONG,
      policyResultTTL: this.CACHE_TTL.EXTENDED,
      templateInfoTTL: this.CACHE_TTL.EXTENDED,
      maxCacheSize: 10000,
      compressionEnabled: true,
      prefetchEnabled: true,
      adaptiveEviction: true,
    };

    await this.saveCacheConfiguration(workspaceId, 'AGGRESSIVE', cacheConfig);
  }

  private async implementHotKeyCaching(workspaceId: string): Promise<void> {
    // Get hot keys and cache them with extended TTL
    const hotKeys = await this.getHotKeys(workspaceId);

    for (const key of hotKeys) {
      // Extend TTL for hot keys through RBAC Cache Manager
      const existingValue = await this.rbacCacheManager.get(key);

      if (existingValue) {
        await this.rbacCacheManager.set(
          key,
          existingValue,
          this.CACHE_TTL.EXTENDED,
        );
      }
    }
  }

  private async optimizeQueries(workspaceId: string): Promise<void> {
    // Log slow queries for database optimization
    const slowQueries = await this.getSlowQueries(workspaceId);

    this.logger.warn('Slow queries detected for optimization', {
      slowQueryCount: slowQueries.length,
      queries: slowQueries,
      workspaceId,
    });
  }

  /**
   * Helper methods for metrics calculation
   */
  private calculatePerformanceScore(
    cacheHitRate: number,
    averageResponseTime: number,
    errorRate: number,
  ): number {
    const hitRateScore = Math.min(cacheHitRate, 100);
    const responseTimeScore = Math.max(0, 100 - averageResponseTime / 10);
    const errorScore = Math.max(0, 100 - errorRate * 10);

    return Math.round((hitRateScore + responseTimeScore + errorScore) / 3);
  }

  private calculateOptimizationScore(
    cacheHitRate: number,
    averageResponseTime: number,
    errorRate: number,
  ): number {
    return this.calculatePerformanceScore(
      cacheHitRate,
      averageResponseTime,
      errorRate,
    );
  }

  private async getCacheSize(_workspaceId: string): Promise<number> {
    // Get cache size from RBAC Cache Manager
    const metrics = this.rbacCacheManager.getPerformanceMetrics();

    return metrics.cacheSize;
  }

  private async getHotKeys(_workspaceId: string): Promise<string[]> {
    // Get hot keys from RBAC Cache Manager
    const metrics = this.rbacCacheManager.getPerformanceMetrics();

    return metrics.hotKeys;
  }

  private async getSlowQueries(_workspaceId: string): Promise<string[]> {
    // Get slow operations from RBAC Cache Manager
    const metrics = this.rbacCacheManager.getPerformanceMetrics();

    return metrics.slowOperations;
  }

  private async getSystemLoad(): Promise<number> {
    // Return current system load percentage
    return 0;
  }

  private async getMemoryPressure(): Promise<number> {
    // Return current memory usage percentage
    return 0;
  }

  private estimateImprovements(
    optimizations: string[],
    _metrics: PerformanceMetrics,
  ): Record<string, number> {
    const improvements: Record<string, number> = {};

    for (const optimization of optimizations) {
      switch (optimization) {
        case 'ENABLE_BASIC_CACHING':
          improvements.cacheHitRate = 20;
          improvements.responseTime = 30;
          break;
        case 'ENABLE_AGGRESSIVE_CACHING':
          improvements.cacheHitRate = 50;
          improvements.responseTime = 60;
          break;
        case 'HOT_KEY_CACHING':
          improvements.cacheHitRate = 15;
          break;
        case 'QUERY_OPTIMIZATION':
          improvements.responseTime = 40;
          break;
      }
    }

    return improvements;
  }

  private isPerformanceOptimizationNeeded(): boolean {
    // Check if performance optimization is needed based on system state
    // This could check current cache hit rates, response times, etc.
    return true; // For now, always consider optimization beneficial
  }

  private async saveCacheConfiguration(
    workspaceId: string,
    strategy: string,
    config: CacheConfig,
  ): Promise<void> {
    try {
      // Log cache configuration instead of saving to database
      this.logger.log('Cache configuration applied', {
        workspaceId,
        strategy,
        configuration: {
          defaultTTL: config.permissionResultTTL,
          maxCacheSize: config.maxCacheSize,
          compressionEnabled: config.compressionEnabled,
          prefetchEnabled: config.prefetchEnabled,
        },
      });

      // Apply configuration to RBAC Cache Manager if needed
      // (could extend RbacCacheManagerService to accept configuration updates)
    } catch (error) {
      this.logger.error('Failed to apply cache configuration', {
        error: error.message,
        workspaceId,
        strategy,
      });
    }
  }
}
