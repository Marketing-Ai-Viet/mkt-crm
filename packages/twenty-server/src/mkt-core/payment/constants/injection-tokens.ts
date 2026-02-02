/**
 * Injection Tokens for Payment Module
 *
 * Dependency injection tokens for decoupled components.
 */

/**
 * VA Provider token for dependency injection
 * @deprecated Use VA_PROVIDER_TOKEN from domain/ports/va-provider.port.ts instead
 */
export const VA_PROVIDER_TOKEN = Symbol('IVAProvider');

/**
 * Webhook Log Repository token for dependency injection
 */
export const WEBHOOK_LOG_REPOSITORY_TOKEN = Symbol('IWebhookLogRepository');
