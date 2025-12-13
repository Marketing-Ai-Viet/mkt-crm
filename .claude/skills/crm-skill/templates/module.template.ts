/**
 * Module Template
 *
 * NestJS module for organizing your feature.
 * Register all providers (services, hooks, resolvers) here.
 *
 * TODO:
 * 1. Replace 'YourEntity' with your entity name
 * 2. Import all providers
 * 3. Export services that other modules need
 */

import { Module } from '@nestjs/common';

// TODO: Import your providers
// Services
// import { YourEntityService } from './services/your-entity.service';

// Resolvers
// import { MktYourEntityResolver } from './resolvers/mkt-your-entity.resolver';

// Pre-Query Hooks
// import { MktYourEntityCreateOnePreQueryHook } from './hooks/mkt-your-entity-create-one.pre-query.hook';
// import { MktYourEntityUpdateOnePreQueryHook } from './hooks/mkt-your-entity-update-one.pre-query.hook';
// import { MktYourEntityDeleteOnePreQueryHook } from './hooks/mkt-your-entity-delete-one.pre-query.hook';

// Post-Query Hooks
// import { MktYourEntityCreateOnePostQueryHook } from './hooks/mkt-your-entity-create-one.post-query.hook';
// import { MktYourEntityUpdateOnePostQueryHook } from './hooks/mkt-your-entity-update-one.post-query.hook';

@Module({
  imports: [
    // TODO: Import other modules if needed
    // MktCustomerModule,
    // MktPaymentModule,
  ],
  providers: [
    // Services
    // YourEntityService,
    // Resolvers
    // MktYourEntityResolver,
    // Pre-Query Hooks
    // MktYourEntityCreateOnePreQueryHook,
    // MktYourEntityUpdateOnePreQueryHook,
    // MktYourEntityDeleteOnePreQueryHook,
    // Post-Query Hooks
    // MktYourEntityCreateOnePostQueryHook,
    // MktYourEntityUpdateOnePostQueryHook,
  ],
  exports: [
    // Export services that other modules need
    // YourEntityService,
  ],
})
export class MktYourEntityModule {}

/**
 * Don't forget to:
 *
 * 1. Add Object ID to mkt-core/constants/mkt-object-ids.ts:
 *    export const MKT_OBJECT_IDS = {
 *      mktYourEntity: 'mkt-your-entity-standard-id',
 *    };
 *
 * 2. Add Field IDs to mkt-core/constants/mkt-field-ids.ts:
 *    export const MKT_FIELD_IDS = {
 *      mktYourEntity: {
 *        name: 'mkt-your-entity-name-field-id',
 *        status: 'mkt-your-entity-status-field-id',
 *      },
 *    };
 *
 * 3. Import module in mkt-core.module.ts:
 *    @Module({
 *      imports: [
 *        MktYourEntityModule,
 *      ],
 *    })
 *    export class MktCoreModule {}
 *
 * 4. Sync metadata after creating workspace entity:
 *    npx nx run twenty-server:command workspace:sync-metadata -f
 */
