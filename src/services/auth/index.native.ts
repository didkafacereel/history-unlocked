import { AuthService } from './AuthService';
import { stubAuthService } from './index';
import { googleAuthService, hasGoogleClientId } from './googleAuth.native';

export * from './AuthService';

/**
 * Native resolution: Google when a client id is configured, otherwise the
 * stand-in — so a development build with no OAuth credentials still runs and
 * still exercises the account UI, exactly as billing behaves without keys.
 *
 * The stand-in reports `isStub`, and the account panel says so. Nothing here
 * ever pretends a local identity is a real one.
 */
let instance: AuthService | null = null;

export function getAuthService(): AuthService {
  instance ??= hasGoogleClientId() ? googleAuthService : stubAuthService;
  return instance;
}
