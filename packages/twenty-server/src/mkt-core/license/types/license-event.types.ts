export interface LicenseRenewingEvent {
  licenseId: string;
  status: string;
  timestamp: string;
  userId?: string;
  workspaceId?: string;
}
