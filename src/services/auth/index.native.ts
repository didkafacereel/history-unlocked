import { firebaseConfigured } from '@/services/firebase';

import { AuthService } from './AuthService';
// From './stubAuth', never './index': on native `./index` IS this file.
import { stubAuthService } from './stubAuth';
import { firebaseAuthService, hasGoogleClientId } from './firebaseAuth.native';

export * from './AuthService';

/**
 * Native resolution: Firebase when the project AND a Google client id are
 * configured, otherwise the stand-in — so a development build with no
 * credentials still runs and still exercises the account UI, exactly as
 * billing behaves without keys.
 *
 * Both are required. A Firebase project without the Google client id can send
 * email links but the Google button returns DEVELOPER_ERROR; a client id
 * without a project has nowhere to exchange the token. Either half alone is a
 * build that offers an account it cannot deliver.
 *
 * The stand-in reports `isStub`, and the account panel says so. Nothing here
 * ever pretends a local identity is a real one.
 */
let instance: AuthService | null = null;

export function getAuthService(): AuthService {
  instance ??= firebaseConfigured && hasGoogleClientId() ? firebaseAuthService : stubAuthService;
  return instance;
}
