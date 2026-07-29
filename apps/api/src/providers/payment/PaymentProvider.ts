// P6.S3 -- provider-only step, same shape SmsProvider (P2.S4) was built
// in before any real route consumed it. The Payment model (§3.2) and the
// real /payments/* routes belong with whichever future step builds
// Order + checkout initiation -- a Payment record's whole point is to be
// attached to a real Order, which doesn't exist yet.
export interface PaymentInitiateParams {
  amountRial: number;
  callbackUrl: string;
  description: string;
  mobile?: string;
  email?: string;
  // Opaque reference, mirrors StockReservation's own `refId?` precedent
  // for "no Order model yet" -- the caller decides what this means.
  orderId?: string;
}

export interface PaymentInitiateResult {
  authority: string;
  redirectUrl: string;
}

export interface PaymentVerifyParams {
  amountRial: number;
  authority: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  refId?: string;
  // Matches §3.2's Payment.raw{} -- whatever a future Payment-model
  // consumer wants to persist verbatim from the provider's own response.
  raw: unknown;
}

export interface PaymentProvider {
  initiate(params: PaymentInitiateParams): Promise<PaymentInitiateResult>;
  verify(params: PaymentVerifyParams): Promise<PaymentVerifyResult>;
}
