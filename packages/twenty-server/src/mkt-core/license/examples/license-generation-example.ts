/**
 * Example: License Generation Job Usage
 *
 * This file demonstrates how the license generation job works
 * when an order status is updated to 'paid'.
 */

import { MessageQueueService } from 'src/engine/core-modules/message-queue/services/message-queue.service';
import { LicenseGenerationJobData } from '../jobs/license-generation.job';

/**
 * Example 1: Manual Job Trigger
 *
 * You can manually trigger the license generation job
 * (though normally this is done automatically via hook)
 */
export async function manuallyTriggerLicenseGeneration(
  messageQueueService: MessageQueueService,
  orderId: string,
  workspaceId: string,
) {
  const jobData: LicenseGenerationJobData = {
    orderId,
    workspaceId,
  };

  await messageQueueService.add('LicenseGenerationJob', jobData);

  console.log(`License generation job queued for order: ${orderId}`);
}

/**
 * Example 2: GraphQL Mutation to Update Order Status
 *
 * This is how you would typically trigger the license generation
 * by updating an order status to 'paid'
 */
export const updateOrderStatusMutation = `
mutation UpdateOrderToPaid($id: ID!) {
  updateOneMktOrder(
    id: $id
    data: {
      status: PAID
    }
  ) {
    id
    name
    status
    totalAmount
    currency
  }
}
`;

/**
 * Example 3: Expected Flow
 *
 * 1. User updates order status to PAID via GraphQL
 * 2. MktOrderUpdateOnePreQueryHook detects status change
 * 3. Hook creates LicenseGenerationJob
 * 4. Job calls external API to get license
 * 5. Job creates license record in database
 * 6. License is linked to the order
 */

/**
 * Example 4: Environment Configuration
 *
 * Required environment variables:
 */
export const requiredEnvironmentVariables = {
  LICENSE_API_URL: 'https://api.license-provider.com/licenses',
  // Add other required env vars here
};

/**
 * Example 5: API Response Format
 *
 * The external license API should return this format:
 */
export const expectedApiResponse = {
  licenseKey: 'LIC-ORDER-1234567890',
  status: 'active',
  expiresAt: '2024-12-31T23:59:59Z',
  // Additional fields can be added as needed
};

/**
 * Example 6: Database Result
 *
 * After job completion, you should see a new license record:
 */
export const expectedLicenseRecord = {
  id: 'license-uuid',
  name: 'License for Order Name',
  licenseKey: 'LIC-ORDER-1234567890',
  status: 'active',
  activatedAt: '2024-01-01T00:00:00Z',
  expiresAt: '2024-12-31T23:59:59Z',
  mktOrderId: 'order-uuid',
  // ... other fields
};

/**
 * Example 7: Error Handling
 *
 * The job handles various error scenarios:
 * - API call failures (retries automatically)
 * - Order not found (logs error and skips)
 * - License already exists (skips to avoid duplicates)
 * - Database errors (throws and retries)
 */

/**
 * Example 8: Monitoring
 *
 * You can monitor the job through:
 * - Application logs (look for LicenseGenerationJob logs)
 * - Message queue dashboard
 * - Database license table
 * - Order-license relationships
 */
