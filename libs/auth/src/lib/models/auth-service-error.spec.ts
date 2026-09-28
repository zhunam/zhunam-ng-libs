import { AUTH_ERROR_CODES, AuthServiceError } from './auth-service-error';

describe('AUTH_ERROR_CODES', () => {
  it('has the exact ten normalized code strings', () => {
    expect(AUTH_ERROR_CODES).toEqual({
      invalidCredential: 'auth/invalid-credential',
      emailAlreadyInUse: 'auth/email-already-in-use',
      userNotFound: 'auth/user-not-found',
      weakPassword: 'auth/weak-password',
      tooManyRequests: 'auth/too-many-requests',
      networkRequestFailed: 'auth/network-request-failed',
      invalidEmail: 'auth/invalid-email',
      invalidActionCode: 'auth/invalid-action-code',
      expiredActionCode: 'auth/expired-action-code',
      unknown: 'auth/unknown',
    });
  });
});

describe('AuthServiceError', () => {
  it('is a real Error subclass with code, message, and cause set from the constructor', () => {
    const original = new Error('original message');
    const error = new AuthServiceError(AUTH_ERROR_CODES.invalidCredential, 'original message', original);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AuthServiceError);
    expect(error.code).toBe('auth/invalid-credential');
    expect(error.message).toBe('original message');
    expect(error.cause).toBe(original);
    expect(error.name).toBe('AuthServiceError');
  });

  it('accepts a non-Error cause unchanged, e.g. a plain object with a code', () => {
    const original = { code: 'invalid_credentials', message: 'nope' };
    const error = new AuthServiceError(AUTH_ERROR_CODES.unknown, 'nope', original);

    expect(error.cause).toBe(original);
  });
});
