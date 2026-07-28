/** Swappable per §8's provider-interface rule — accessed only through this
 * interface, never a concrete implementation, everywhere else in the app. */
export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}
