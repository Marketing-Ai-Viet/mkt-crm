import { createBlockHooks } from 'src/mkt-core/common/hooks/block-hook.factory';
import { BlockHookConfig } from 'src/mkt-core/common/hooks/types/block-hook.types';

const DASHBOARD_WIDGET_BLOCK_CONFIG: BlockHookConfig = {
  entityName: 'mktDashboardWidget',
  logContext: 'Dashboard:BlockHook',
  blockedMessage:
    'Use Dashboard GraphQL API instead of auto-generated operations',
};

const DASHBOARD_WIDGET_BLOCK_HOOKS_RESULT = createBlockHooks(
  DASHBOARD_WIDGET_BLOCK_CONFIG,
);

export const DASHBOARD_WIDGET_BLOCK_HOOKS =
  DASHBOARD_WIDGET_BLOCK_HOOKS_RESULT.providers;
export const DASHBOARD_WIDGET_BLOCKED_OPERATIONS =
  DASHBOARD_WIDGET_BLOCK_HOOKS_RESULT.blockedOperations;

export const DASHBOARD_BLOCK_HOOKS = [...DASHBOARD_WIDGET_BLOCK_HOOKS];
