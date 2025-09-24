// /**
//  * Permission Template Service
//  * Step 4 of 15-step permission validation
//  * Applies permission templates and patterns based on roles and departments
//  */
//
// import { Injectable, Logger } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
//
// import {
//   PermissionTemplateStep,
//   StepValidationResult,
// } from 'src/mkt-core/mkt-rbac-enterprise-grade/interfaces/validation-step.interface';
//
// import { EnhancedPermissionContext } from 'src/mkt-core/mkt-rbac-enterprise-grade/types/enhanced-permission-context.type';
// import {
//   VALIDATION_STEPS,
//   PERMISSION_TEMPLATES,
//   CACHE_KEY_PREFIXES,
// } from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/enterprise-rbac.constants';
// import { RbacCacheService } from './rbac-cache.service';
//
// /**
//  * Permission template configuration
//  */
// interface PermissionTemplate {
//   id: string;
//   name: string;
//   description: string;
//   rolePattern: string[];
//   departmentPattern: string[];
//   resourcePattern: string[];
//   actionPattern: string[];
//   permissions: {
//     action: string;
//     resource: string;
//     effect: 'ALLOW' | 'DENY';
//     conditions?: Record<string, any>;
//     priority: number;
//   }[];
//   inheritanceRules: {
//     inheritsFromParent: boolean;
//     inheritsFromRole: boolean;
//     inheritsFromDepartment: boolean;
//     overrideParent: boolean;
//   };
//   expirationSettings?: {
//     enabled: boolean;
//     defaultDuration: number; // in days
//     maxDuration: number;
//   };
//   complianceRequired: boolean;
//   auditLevel: 'BASIC' | 'DETAILED' | 'COMPREHENSIVE';
// }
//
// /**
//  * Template match result
//  */
// interface TemplateMatchResult {
//   template: PermissionTemplate;
//   matchScore: number;
//   applicablePermissions: any[];
//   inheritanceChain: string[];
//   conflictResolution: {
//     conflicts: any[];
//     resolution: 'MOST_RESTRICTIVE' | 'MOST_PERMISSIVE' | 'EXPLICIT_DENY';
//   };
// }
//
// @Injectable()
// export class PermissionTemplateService implements PermissionTemplateStep {
//   private readonly logger = new Logger(PermissionTemplateService.name);
//
//   readonly stepNumber = VALIDATION_STEPS.PERMISSION_TEMPLATE;
//   readonly stepName = 'Permission Template Check';
//   readonly description = 'Apply permission templates and patterns';
//   readonly isRequired = false;
//   readonly canSkip = true;
//   readonly isAsync = true;
//   readonly priority = 70;
//   readonly maxExecutionTime = 200;
//   readonly enableCaching = true;
//
//   constructor(
//     private readonly cacheService: RbacCacheService,
//   ) {}
//
//   /**
//    * Main validation method
//    */
//   async validate(
//     context: EnhancedPermissionContext,
//   ): Promise<StepValidationResult> {
//     const startTime = Date.now();
//
//     try {
//       this.logger.debug(
//         `Starting permission template check for user: ${context.userContext.userId}`,
//       );
//
//       // Check if we can skip this step
//       if (!this.shouldExecute(context)) {
//         return this.createSkipResult(
//           'Direct permissions or public resource access detected',
//           startTime,
//         );
//       }
//
//       // Find applicable templates
//       const applicableTemplates = await this.findApplicableTemplates(context);
//
//       if (applicableTemplates.length === 0) {
//         this.logger.debug('No applicable permission templates found');
//         return this.createSkipResult('No applicable templates found', startTime);
//       }
//
//       // Apply templates and resolve conflicts
//       const templateResults = await this.applyTemplates(
//         applicableTemplates,
//         context,
//       );
//
//       // Build permission grants
//       const permissionGrants = await this.buildPermissionGrants(
//         templateResults,
//         context,
//       );
//
//       // Cache results for future use
//       await this.cacheTemplateResults(context, permissionGrants);
//
//       const executionTime = Date.now() - startTime;
//
//       return {
//         result: 'PASS',
//         reason: `Applied ${applicableTemplates.length} permission template(s)`,
//         continue: true,
//         executionTime,
//         stepData: {
//           appliedTemplates: applicableTemplates.map(t => t.template.id),
//           permissionGrants,
//           conflictsResolved: templateResults.reduce(
//             (sum, r) => sum + r.conflictResolution.conflicts.length,
//             0,
//           ),
//         },
//         modifyContext: {
//           permissionGrants,
//           templateMetadata: {
//             appliedTemplates: applicableTemplates.map(t => t.template.id),
//             inheritanceChain: templateResults.flatMap(
//               r => r.inheritanceChain,
//             ),
//           },
//         },
//       };
//     } catch (error) {
//       this.logger.error(
//         `Error in permission template check: ${error.message}`,
//         error.stack,
//       );
//
//       return this.createErrorResult(error.message, startTime);
//     }
//   }
//
//   /**
//    * Determine if this step should be executed
//    */
//   shouldExecute(context: EnhancedPermissionContext): boolean {
//     // Skip if direct permission grants exist
//     if (context.directPermissions?.length > 0) {
//       return false;
//     }
//
//     // Skip for public resource access
//     if (context.resourceContext?.confidentialityLevel === 'PUBLIC') {
//       return false;
//     }
//
//     // Skip for system-level operations
//     if (context.operationContext?.isSystemOperation) {
//       return false;
//     }
//
//     return true;
//   }
//
//   /**
//    * Get estimated execution time
//    */
//   getEstimatedExecutionTime(context: EnhancedPermissionContext): number {
//     const baseTime = 100;
//     const templateCount = context.userContext.roles?.length || 1;
//
//     return Math.min(baseTime + (templateCount * 20), this.maxExecutionTime);
//   }
//
//   /**
//    * Find applicable permission templates
//    */
//   private async findApplicableTemplates(
//     context: EnhancedPermissionContext,
//   ): Promise<TemplateMatchResult[]> {
//     const cacheKey = this.getCacheKey('templates', context);
//
//     // Try cache first
//     const cached = await this.cacheService.get<TemplateMatchResult[]>(cacheKey);
//     if (cached) {
//       this.logger.debug('Using cached template results');
//       return cached;
//     }
//
//     const templates = await this.loadPermissionTemplates();
//     const matches: TemplateMatchResult[] = [];
//
//     for (const template of templates) {
//       const matchScore = this.calculateMatchScore(template, context);
//
//       if (matchScore > 0.5) { // 50% match threshold
//         const applicablePermissions = await this.filterApplicablePermissions(
//           template,
//           context,
//         );
//
//         const inheritanceChain = await this.buildInheritanceChain(
//           template,
//           context,
//         );
//
//         const conflictResolution = await this.resolveTemplateConflicts(
//           template,
//           context,
//         );
//
//         matches.push({
//           template,
//           matchScore,
//           applicablePermissions,
//           inheritanceChain,
//           conflictResolution,
//         });
//       }
//     }
//
//     // Sort by match score (highest first)
//     matches.sort((a, b) => b.matchScore - a.matchScore);
//
//     // Cache results
//     await this.cacheService.set(cacheKey, matches, 300); // 5 minutes
//
//     return matches;
//   }
//
//   /**
//    * Load permission templates from configuration
//    */
//   private async loadPermissionTemplates(): Promise<PermissionTemplate[]> {
//     return PERMISSION_TEMPLATES.map(template => ({
//       id: template.id,
//       name: template.name,
//       description: template.description,
//       rolePattern: template.rolePattern,
//       departmentPattern: template.departmentPattern,
//       resourcePattern: template.resourcePattern,
//       actionPattern: template.actionPattern,
//       permissions: template.permissions,
//       inheritanceRules: template.inheritanceRules,
//       expirationSettings: template.expirationSettings,
//       complianceRequired: template.complianceRequired,
//       auditLevel: template.auditLevel,
//     }));
//   }
//
//   /**
//    * Calculate match score for template against context
//    */
//   private calculateMatchScore(
//     template: PermissionTemplate,
//     context: EnhancedPermissionContext,
//   ): number {
//     let score = 0;
//     let totalChecks = 0;
//
//     // Check role pattern match
//     if (template.rolePattern.length > 0) {
//       const roleMatches = context.userContext.roles?.some(role =>
//         template.rolePattern.some(pattern =>
//           role.toLowerCase().includes(pattern.toLowerCase()),
//         ),
//       );
//       score += roleMatches ? 0.3 : 0;
//       totalChecks += 0.3;
//     }
//
//     // Check department pattern match
//     if (template.departmentPattern.length > 0) {
//       const deptMatches = template.departmentPattern.some(pattern =>
//         context.hierarchyContext?.currentDepartment?.toLowerCase()
//           .includes(pattern.toLowerCase()),
//       );
//       score += deptMatches ? 0.3 : 0;
//       totalChecks += 0.3;
//     }
//
//     // Check resource pattern match
//     if (template.resourcePattern.length > 0) {
//       const resourceMatches = template.resourcePattern.some(pattern =>
//         context.resourceContext?.objectName?.toLowerCase()
//           .includes(pattern.toLowerCase()),
//       );
//       score += resourceMatches ? 0.2 : 0;
//       totalChecks += 0.2;
//     }
//
//     // Check action pattern match
//     if (template.actionPattern.length > 0) {
//       const actionMatches = template.actionPattern.some(pattern =>
//         context.operationContext?.action?.toLowerCase()
//           .includes(pattern.toLowerCase()),
//       );
//       score += actionMatches ? 0.2 : 0;
//       totalChecks += 0.2;
//     }
//
//     return totalChecks > 0 ? score / totalChecks : 0;
//   }
//
//   /**
//    * Filter permissions applicable to current context
//    */
//   private async filterApplicablePermissions(
//     template: PermissionTemplate,
//     context: EnhancedPermissionContext,
//   ): Promise<any[]> {
//     return template.permissions.filter(permission => {
//       // Check if action matches
//       if (
//         context.operationContext?.action &&
//         !permission.action.includes(context.operationContext.action)
//       ) {
//         return false;
//       }
//
//       // Check if resource matches
//       if (
//         context.resourceContext?.objectName &&
//         !permission.resource.includes(context.resourceContext.objectName)
//       ) {
//         return false;
//       }
//
//       // Check additional conditions
//       if (permission.conditions) {
//         return this.evaluateConditions(permission.conditions, context);
//       }
//
//       return true;
//     });
//   }
//
//   /**
//    * Build inheritance chain for template
//    */
//   private async buildInheritanceChain(
//     template: PermissionTemplate,
//     context: EnhancedPermissionContext,
//   ): Promise<string[]> {
//     const chain: string[] = [template.id];
//
//     // Add parent department inheritance
//     if (template.inheritanceRules.inheritsFromParent) {
//       const parentDepartments = context.hierarchyContext?.parentDepartments || [];
//       chain.push(...parentDepartments.map(dept => `parent:${dept}`));
//     }
//
//     // Add role inheritance
//     if (template.inheritanceRules.inheritsFromRole) {
//       const roles = context.userContext.roles || [];
//       chain.push(...roles.map(role => `role:${role}`));
//     }
//
//     // Add department inheritance
//     if (template.inheritanceRules.inheritsFromDepartment) {
//       const dept = context.hierarchyContext?.currentDepartment;
//       if (dept) {
//         chain.push(`department:${dept}`);
//       }
//     }
//
//     return chain;
//   }
//
//   /**
//    * Resolve conflicts between templates
//    */
//   private async resolveTemplateConflicts(
//     template: PermissionTemplate,
//     context: EnhancedPermissionContext,
//   ): Promise<{
//     conflicts: any[];
//     resolution: 'MOST_RESTRICTIVE' | 'MOST_PERMISSIVE' | 'EXPLICIT_DENY';
//   }> {
//     // Simple conflict resolution for now
//     return {
//       conflicts: [],
//       resolution: 'MOST_RESTRICTIVE',
//     };
//   }
//
//   /**
//    * Apply templates to generate permission grants
//    */
//   private async applyTemplates(
//     templates: TemplateMatchResult[],
//     context: EnhancedPermissionContext,
//   ): Promise<TemplateMatchResult[]> {
//     // Process templates in priority order
//     const processedTemplates: TemplateMatchResult[] = [];
//
//     for (const template of templates) {
//       // Apply inheritance rules
//       const inheritedPermissions = await this.applyInheritanceRules(
//         template,
//         context,
//       );
//
//       // Merge with template permissions
//       template.applicablePermissions = [
//         ...template.applicablePermissions,
//         ...inheritedPermissions,
//       ];
//
//       processedTemplates.push(template);
//     }
//
//     return processedTemplates;
//   }
//
//   /**
//    * Apply inheritance rules for template
//    */
//   private async applyInheritanceRules(
//     template: TemplateMatchResult,
//     context: EnhancedPermissionContext,
//   ): Promise<any[]> {
//     const inheritedPermissions: any[] = [];
//
//     // Apply parent department inheritance
//     if (template.template.inheritanceRules.inheritsFromParent) {
//       const parentPermissions = await this.getParentDepartmentPermissions(
//         context,
//       );
//       inheritedPermissions.push(...parentPermissions);
//     }
//
//     // Apply role inheritance
//     if (template.template.inheritanceRules.inheritsFromRole) {
//       const rolePermissions = await this.getRolePermissions(context);
//       inheritedPermissions.push(...rolePermissions);
//     }
//
//     return inheritedPermissions;
//   }
//
//   /**
//    * Get parent department permissions
//    */
//   private async getParentDepartmentPermissions(
//     context: EnhancedPermissionContext,
//   ): Promise<any[]> {
//     // Implementation would query parent department permissions
//     return [];
//   }
//
//   /**
//    * Get role permissions
//    */
//   private async getRolePermissions(
//     context: EnhancedPermissionContext,
//   ): Promise<any[]> {
//     // Implementation would query role-based permissions
//     return [];
//   }
//
//   /**
//    * Build final permission grants
//    */
//   private async buildPermissionGrants(
//     templates: TemplateMatchResult[],
//     context: EnhancedPermissionContext,
//   ): Promise<any[]> {
//     const grants: any[] = [];
//
//     for (const template of templates) {
//       for (const permission of template.applicablePermissions) {
//         grants.push({
//           action: permission.action,
//           resource: permission.resource,
//           effect: permission.effect,
//           source: `template:${template.template.id}`,
//           priority: permission.priority,
//           conditions: permission.conditions,
//           inheritanceChain: template.inheritanceChain,
//         });
//       }
//     }
//
//     // Sort by priority (highest first)
//     grants.sort((a, b) => (b.priority || 0) - (a.priority || 0));
//
//     return grants;
//   }
//
//   /**
//    * Evaluate permission conditions
//    */
//   private evaluateConditions(
//     conditions: Record<string, any>,
//     context: EnhancedPermissionContext,
//   ): boolean {
//     // Simple condition evaluation
//     // In production, this would be more sophisticated
//     return true;
//   }
//
//   /**
//    * Cache template results
//    */
//   private async cacheTemplateResults(
//     context: EnhancedPermissionContext,
//     grants: any[],
//   ): Promise<void> {
//     const cacheKey = this.getCacheKey('grants', context);
//     await this.cacheService.set(cacheKey, grants, 600); // 10 minutes
//   }
//
//   /**
//    * Generate cache key
//    */
//   private getCacheKey(type: string, context: EnhancedPermissionContext): string {
//     const userId = context.userContext.userId;
//     const resource = context.resourceContext?.objectName || 'unknown';
//     const action = context.operationContext?.action || 'unknown';
//
//     return `${CACHE_KEY_PREFIXES.PERMISSION_TEMPLATE}${type}:${userId}:${resource}:${action}`;
//   }
//
//   /**
//    * Helper methods for creating results
//    */
//   private createSkipResult(
//     reason: string,
//     startTime: number,
//   ): StepValidationResult {
//     return {
//       result: 'SKIP',
//       reason,
//       continue: true,
//       executionTime: Date.now() - startTime,
//     };
//   }
//
//   private createErrorResult(
//     error: string,
//     startTime: number,
//   ): StepValidationResult {
//     return {
//       result: 'ERROR',
//       reason: `Template processing error: ${error}`,
//       continue: false,
//       executionTime: Date.now() - startTime,
//       errors: [error],
//     };
//   }
// }
