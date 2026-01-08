export type OAuth2Token = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  scopes: string[];
  issuedAt: Date;
};

export type OAuth2TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
};

export type OAuth2TokenMetadata = {
  valid: boolean;
  expiresIn: number;
  scopes: string[];
  issuedAt: Date;
  expiresAt: Date;
  lastRefreshedAt: Date;
  refreshCount: number;
};
