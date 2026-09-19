import { createDevPurchaseService } from './devPurchaseService';
import { PurchaseService } from './PurchaseService';

/**
 * Base resolution (web + typecheck): always the dev provider. RevenueCat is
 * never referenced here, so react-native-purchases stays out of the web bundle.
 * Native builds resolve index.native.ts instead.
 */
let instance: PurchaseService | null = null;

export function getPurchaseService(): PurchaseService {
  if (!instance) {
    instance = createDevPurchaseService();
  }
  return instance;
}

export * from './PurchaseService';
