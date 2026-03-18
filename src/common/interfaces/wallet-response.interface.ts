export interface WalletTransactionData {
  reference: string;
  fromCurrency?: string;
  toCurrency?: string;
  fromAmount?: number;
  toAmount?: number;
  currency?: string;
  amount?: number;
  newBalance?: number;
  rate?: number;
  timestamp: Date | null;
}

export interface WalletResponse {
  message: string;
  data: WalletTransactionData;
  transaction?: WalletTransactionData;
}
