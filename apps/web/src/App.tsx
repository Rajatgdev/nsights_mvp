import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Login } from './components/Login';
import { me, signOut, type Me } from './lib/session';
import { SlideProvider } from './lib/slides';
import { Dashboard } from './screens/Dashboard';
import { Research } from './screens/Research';
import { Portfolio } from './screens/Portfolio';
import { Insights } from './screens/Insights';
import { Design } from './screens/Design';
import { Settings } from './screens/Settings';

export function App() {
  const [phase, setPhase] = useState<'loading' | 'in' | 'out'>('loading');
  const [user, setUser] = useState<Me | null>(null);

  async function refresh() {
    const m = await me();
    if (m?.user) { setUser(m); setPhase('in'); } else { setUser(null); setPhase('out'); }
  }
  useEffect(() => { refresh(); }, []);

  if (phase === 'loading') return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;
  if (phase === 'out' || !user) return <Login onAuthed={refresh} />;

  return (
    <SlideProvider>
    <BrowserRouter>
      <AppShell user={user} onSignOut={async () => { await signOut(); refresh(); }}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/research" element={<Research />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/design" element={<Design />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
    </SlideProvider>
  );
}