export interface FIREBASE_AUTH_RESPONSE {
  idToken: string;
  refreshToken: string;
  localId: string;
}

export type CALL_FIREBASE_DATA = {
  orderCode: string | null;
  QRCodeUrl: string | null;
};

//LicenseApiResponse
export interface LICENSE_API_RESPONSE {
  licenseKey: string;
  status: string;
  expiresAt: string;
  licenseUuid?: string | null | undefined;
  // add other fields according to API response
}
