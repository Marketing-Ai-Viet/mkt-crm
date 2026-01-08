// ============================================
// OAUTH2 EVENT TYPES
// ============================================

/**
 * Event names for OAuth2 events
 */
export const OAUTH2_EVENTS = {
  TOKEN_ACQUIRED: 'oauth2.token.acquired',
  TOKEN_REFRESHED: 'oauth2.token.refreshed',
  TOKEN_INVALIDATED: 'oauth2.token.invalidated',
  TOKEN_EXPIRED: 'oauth2.token.expired',
} as const;

export type OAuth2EventName =
  (typeof OAUTH2_EVENTS)[keyof typeof OAUTH2_EVENTS];

/**
 * Event payload when OAuth2 token is acquired or refreshed
 */
export type OAuth2TokenAcquiredEvent = {
  /** Client ID that acquired the token */
  clientId: string;

  /** Scopes granted to the token */
  scopes: string[];

  /** Token expiration time in seconds */
  expiresIn: number;

  /** Whether this is an initial token or a refresh */
  isRefresh: boolean;

  /** Timestamp when the event occurred */
  timestamp: Date;
};

/**
 * Event payload when OAuth2 token is invalidated
 */
export type OAuth2TokenInvalidatedEvent = {
  /** Client ID whose token was invalidated */
  clientId: string;

  /** Timestamp when the event occurred */
  timestamp: Date;
};
