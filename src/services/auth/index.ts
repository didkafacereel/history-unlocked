import { AuthService } from './AuthService';
import { stubAuthService } from './stubAuth';

export * from './AuthService';
export { stubAuthService } from './stubAuth';

/**
 * Base resolution (web + typecheck): a stand-in.
 *
 * Google's native sign-in module is never referenced here, so it stays out of
 * the web bundle — the same split billing uses. Native builds resolve
 * index.native.ts instead.
 */

export function getAuthService(): AuthService {
  return stubAuthService;
}
