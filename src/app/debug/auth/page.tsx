'use client';
 
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type AuthUserSummary = {
  hasSession: boolean;
  hasUser: boolean;
  userId: string | null;
  email: string | null;
  provider: string | null;
  lastSignIn: string | null;
  createdAt: string | null;
  emailConfirmed: string | null;
  role: string | null;
};

type AuthSessionSummary = {
  expiresAt: number | undefined;
  tokenType: string;
  providerToken: 'PRESENT' | null;
  providerRefreshToken: 'PRESENT' | null;
};

interface AuthState {
  loading: boolean;
  user: AuthUserSummary | null;
  session: AuthSessionSummary | null;
  error: string | null;
  supabaseConnected: boolean;
}

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return 'Unknown error';
};

export default function DebugAuth() {
  const [state, setState] = useState<AuthState>({ loading: true, user: null, session: null, error: null, supabaseConnected: false });

  async function testAuth() {
    try {
      const supabase = createClient();

      // Test connection
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setState({ loading: false, user: null, session: null, error: sessionError.message, supabaseConnected: true });
        return;
      }

      // Get user
      const { data: userData, error: userError } = await supabase.auth.getUser();

      // Get auth settings
      const authConfig: AuthUserSummary = {
        hasSession: !!sessionData.session,
        hasUser: !!userData.user,
        userId: userData.user?.id || null,
        email: userData.user?.email || null,
        provider: userData.user?.app_metadata?.provider || null,
        lastSignIn: userData.user?.last_sign_in_at || null,
        createdAt: userData.user?.created_at || null,
        emailConfirmed: userData.user?.email_confirmed_at || null,
        role: userData.user?.role || null,
      };

      setState({
        loading: false,
        user: authConfig,
        session: sessionData.session ? {
          expiresAt: sessionData.session.expires_at,
          tokenType: sessionData.session.token_type,
          providerToken: sessionData.session.provider_token ? 'PRESENT' : null,
          providerRefreshToken: sessionData.session.provider_refresh_token ? 'PRESENT' : null,
        } : null,
        error: userError?.message || null,
        supabaseConnected: true,
      });
    } catch (e: unknown) {
      setState({ loading: false, user: null, session: null, error: getErrorMessage(e), supabaseConnected: false });
    }
  }

  useEffect(() => {
    testAuth();
  }, []);

  const _handleTestSignIn = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/debug/auth` },
      });
      if (error) alert(`OAuth Error: ${error.message}`);
    } catch (e: unknown) {
      alert(`Error: ${getErrorMessage(e)}`);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    testAuth();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#020203', color: 'rgba(255,255,255,0.92)', padding: '48px 24px', fontFamily: 'var(--font-body, Outfit), sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <a href="/debug" style={{ fontSize: 12, color: 'rgba(200,169,110,0.6)', textDecoration: 'none', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>&larr; Back to Debug</a>
        <h1 style={{ fontSize: 32, fontWeight: 300, fontFamily: 'var(--font-display, Cormorant), serif', color: '#c8a96e', marginTop: 16, marginBottom: 8 }}>Authentication Debug</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace', marginBottom: 32 }}>
          Test Supabase auth, session state, and user data
        </p>

        {state.loading ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Testing auth...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Connection status */}
            <div style={{ padding: '16px 20px', background: '#0d0d18', border: `1px solid ${state.supabaseConnected ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 8, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Supabase Connection</div>
              <div style={{ fontSize: 14, color: state.supabaseConnected ? '#22c55e' : '#ef4444' }}>
                {state.supabaseConnected ? 'Connected' : 'Failed'}
              </div>
            </div>

            {/* Error */}
            {state.error && (
              <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#ef4444', marginBottom: 4, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Error</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>{state.error}</div>
              </div>
            )}

            {/* User info */}
            <div style={{ padding: '16px 20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>User Data</div>
              {state.user ? (
                <pre style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono, DM Mono), monospace', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {JSON.stringify(state.user, null, 2)}
                </pre>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No authenticated user</p>
              )}
            </div>

            {/* Session info */}
            <div style={{ padding: '16px 20px', background: '#0d0d18', border: '1px solid rgba(255,255,255,0.055)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12, fontFamily: 'var(--font-mono, DM Mono), monospace' }}>Session Data</div>
              {state.session ? (
                <pre style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'var(--font-mono, DM Mono), monospace', whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                  {JSON.stringify(state.session, null, 2)}
                </pre>
              ) : (
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>No active session</p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button onClick={testAuth} style={{ padding: '10px 20px', background: 'rgba(200,169,110,0.15)', border: '1px solid rgba(200,169,110,0.3)', borderRadius: 6, color: '#c8a96e', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
                Refresh
              </button>
              <button onClick={handleSignOut} style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, color: '#ef4444', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-mono, DM Mono), monospace' }}>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
