import { Logger } from '@nestjs/common';

import { Client } from 'pg';
import { Watcher } from 'casbin';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { safeJsonStringify } from 'src/mkt-core/utils/json.util';
import {
  CASBIN_LOG_CONTEXT,
  CASBIN_MESSAGES,
} from 'src/mkt-core/mkt-rbac-enterprise-grade/constants/messages';

/**
 * PostgreSQL NOTIFY Watcher for Casbin
 *
 * Sử dụng PostgreSQL LISTEN/NOTIFY thay vì Redis
 * để sync policies giữa các instances.
 *
 * Ưu điểm:
 * - Không cần thêm dependency (Redis)
 * - Sử dụng PostgreSQL có sẵn
 * - Built-in trong PostgreSQL, stable
 *
 * Hạn chế:
 * - Payload max 8000 bytes (đủ cho sync signals)
 * - Messages không persist nếu client disconnect
 * - Giải pháp: hourly full resync
 */
export class PgNotifyWatcher implements Watcher {
  private readonly logger = new Logger(`${CASBIN_LOG_CONTEXT}:PgNotifyWatcher`);
  private client: Client | null = null;
  private callback: (() => void) | null = null;
  private reconnectAttempts = 0;
  private isClosing = false;

  private readonly channel: string;
  private readonly maxReconnectAttempts: number;
  private readonly baseDelayMs: number;

  constructor(
    private readonly connectionString: string,
    options?: {
      channel?: string;
      maxReconnectAttempts?: number;
      baseDelayMs?: number;
    },
  ) {
    this.channel = options?.channel ?? 'casbin_policy_update';
    this.maxReconnectAttempts = options?.maxReconnectAttempts ?? 5;
    this.baseDelayMs = options?.baseDelayMs ?? 1000;
  }

  /**
   * Initialize watcher - connect to PostgreSQL
   */
  async init(): Promise<void> {
    await this.connect();
  }

  /**
   * Connect to PostgreSQL and setup LISTEN
   */
  private async connect(): Promise<void> {
    if (this.isClosing) {
      return;
    }

    try {
      this.client = new Client({ connectionString: this.connectionString });
      await this.client.connect();
      await this.client.query(`LISTEN ${this.channel}`);

      // Setup notification handler
      this.client.on('notification', (msg) => {
        if (msg.channel === this.channel && this.callback) {
          this.logger.debug(
            CASBIN_MESSAGES.LOG.WATCHER_NOTIFICATION(msg.payload ?? ''),
          );
          this.callback();
        }
      });

      // Setup error handler for auto-reconnect
      this.client.on('error', async (err) => {
        this.logger.error(
          CASBIN_MESSAGES.ERROR.WATCHER_CONNECTION_FAILED(err.message),
        );
        await this.handleReconnect();
      });

      // Setup end handler
      this.client.on('end', async () => {
        if (!this.isClosing) {
          this.logger.warn(CASBIN_MESSAGES.WARN.WATCHER_DISCONNECTED);
          await this.handleReconnect();
        }
      });

      // Reset reconnect counter on successful connect
      this.reconnectAttempts = 0;
      this.logger.log(CASBIN_MESSAGES.LOG.WATCHER_CONNECTED);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        CASBIN_MESSAGES.ERROR.WATCHER_CONNECTION_FAILED(errorMessage),
      );
      await this.handleReconnect();
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnect(): Promise<void> {
    if (this.isClosing) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(CASBIN_MESSAGES.ERROR.WATCHER_MAX_RECONNECTS);

      return;
    }

    this.reconnectAttempts++;
    const delay = this.baseDelayMs * Math.pow(2, this.reconnectAttempts);

    this.logger.warn(
      CASBIN_MESSAGES.WARN.WATCHER_RECONNECTING(this.reconnectAttempts, delay),
    );

    // Cleanup old client
    await this.cleanupClient();

    // Schedule reconnect
    setTimeout(async () => {
      await this.connect();
    }, delay);
  }

  /**
   * Cleanup client connection
   */
  private async cleanupClient(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end();
      } catch {
        // Ignore cleanup errors
      }
      this.client = null;
    }
  }

  /**
   * Set callback to be called when policy updates are received
   */
  setUpdateCallback(callback: () => void): void {
    this.callback = callback;
  }

  /**
   * Notify other instances about policy update
   */
  async update(): Promise<boolean> {
    if (!this.client) {
      this.logger.error('Cannot send NOTIFY: client not connected');

      return false;
    }

    try {
      const payload = safeJsonStringify({
        timestamp: DateTimeUtils.toISO(DateTimeUtils.now()),
        source: process.env.HOSTNAME ?? 'unknown',
      });

      await this.client.query(`NOTIFY ${this.channel}, '${payload}'`);

      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        CASBIN_MESSAGES.ERROR.WATCHER_NOTIFY_FAILED(errorMessage),
      );

      return false;
    }
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    this.isClosing = true;

    if (this.client) {
      try {
        await this.client.query(`UNLISTEN ${this.channel}`);
        await this.client.end();
      } catch {
        // Ignore cleanup errors
      }
      this.client = null;
    }

    this.logger.log(CASBIN_MESSAGES.LOG.WATCHER_CLOSED);
  }

  /**
   * Check if watcher is connected
   */
  isConnected(): boolean {
    return this.client !== null && this.reconnectAttempts === 0;
  }

  /**
   * Get current reconnect attempts (for metrics/monitoring)
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * Get channel name
   */
  getChannel(): string {
    return this.channel;
  }
}
