import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Login } from './components/Login';
import { AcceptInvite } from './components/AcceptInvite';
import { me, signOut, type Me } from './lib/session';
import { SlideProvider } from './lib/slides';
import { Dashboard } from './screens/Dashboard';
import { Research } from './screens/Research';
import { Portfolio } from './screens/Portfolio';
import { Insights } from './screens/Insights';
import { Design } from './screens/Design';
import { Settings } from './screens/Settings';
import { Console } from './screens/Console';
import { Team } from './screens/Team';

export function App() {
  const [phase, setPhase] = useState<'loading' | 'in' | 'out'>('loading');
  const [user, setUser] = useState<Me | null>(null);

  async function refresh() {
    const m = await me();
    if (m?.user) { setUser(m); setPhase('in'); } else { setUser(null); setPhase('out'); }
  }
  useEffect(() => { refresh(); }, []);

  // Accept-invite is public — it must render whether or not there's a session,
  // and before the main app gate. Everything else below requires auth.
  const onAccept = window.location.pathname.startsWith('/accept-invite/');

  if (phase === 'loading') return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  if (onAccept && (phase === 'out' || !user)) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/accept-invite/:token" element={<AcceptInvite onAuthed={refresh} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    );
  }

  if (phase === 'out' || !user) return <Login onAuthed={refresh} />;

  const isPlatform = user.user.role === 'platform_admin';
  const isFirmAdmin = user.membership?.role === 'firm_admin';

  return (
    <SlideProvider>
    <BrowserRouter>
      <AppShell user={user} onSignOut={async () => { await signOut(); refresh(); }}>
        <Routes>
          <Route path="/" element={<Navigate to={isPlatform ? '/platform' : '/dashboard'} replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/research" element={<Research />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/design" element={<Design />} />
          <Route path="/settings" element={<Settings />} />
          {isPlatform && <Route path="/platform" element={<Console />} />}
          {isFirmAdmin && <Route path="/team" element={<Team meUserId={user.user.id} />} />}
          {/* Accept-invite while already signed in → send home. */}
          <Route path="/accept-invite/:token" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
    </SlideProvider>
  );
}