import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_SERVICE } from '@zhunam/auth';
import { provideSupabaseAuth } from './provide-supabase-auth';

const { createClientMock, onAuthStateChangeMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

describe('provideSupabaseAuth', () => {
  const config = { url: 'https://app.supabase.co', anonKey: 'anon-key' };
  const fakeClient = { auth: { onAuthStateChange: onAuthStateChangeMock } };

  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockReturnValue(fakeClient);
    onAuthStateChangeMock.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  });

  it('creates the Supabase client with the given config and registers an AuthService under AUTH_SERVICE', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideSupabaseAuth(config)],
    });

    const authService = TestBed.inject(AUTH_SERVICE);

    expect(createClientMock).toHaveBeenCalledWith(config.url, config.anonKey);
    expect(authService.currentUser()).toBeNull();
    expect(authService.isAuthenticated()).toBe(false);
  });
});
