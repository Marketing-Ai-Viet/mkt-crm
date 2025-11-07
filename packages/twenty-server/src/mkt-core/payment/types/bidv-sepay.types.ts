export interface BidvSepayOrderRequest {
  amount: number;
  order_code: string;
  duration: number;
  with_qrcode: boolean;
}

export interface BidvSepayOrderData {
  order_id: string;
  order_code: string;
  va_number: string;
  va_holder_name: string;
  amount: number;
  status: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  expired_at: string;
  qr_code: string;
  qr_code_url: string;
}

export interface BidvSepayApiResponse {
  status: string;
  message: string;
  data: BidvSepayOrderData;
}

export interface BidvSepayConfig {
  apiUrl: string;
  authToken: string;
  cookie: string;
}
