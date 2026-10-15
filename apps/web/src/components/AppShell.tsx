import { NavLink } from 'react-router-dom';
import { Logo } from './Login';
import { SlideRail } from './SlideRail';
import type { Me } from '../lib/session';

const NAV = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/research', label: 'Research & Comparison' },
  { to: '/portfolio', label: 'Portfolio Builder' },
  { to: '/insights', label: 'Insights' },
];
const FIRM_NAV = [
  { to: '/design', label: 'Design' },
  { to: '/settings', label: 'Settings' },
];
const SOON = ['Financial Planning', 'Client Portal'];

export function AppShell({ user, onSignOut, children }: {
  user: Me; onSignOut: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Left sidebar */}
      <aside style={{
        width: 236, flexShrink: 0, background: 'var(--surface)',
        borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column',
        padding: '16px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '4px 8px 16px' }}>
          <Logo size={26} />
          <strong style={{ fontSize: 17, letterSpacing: -0.2 }}>nSights</strong>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n) => <NavItem key={n.to} {...n} />)}
        </nav>

        <Divider />
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FIRM_NAV.map((n) => <NavItem key={n.to} {...n} />)}
        </nav>

        <Divider />
        <div style={{ ...labelStyle, padding: '2px 12px 6px' }}>Coming soon</div>
        {SOON.map((s) => (
          <span key={s} style={{
            padding: '8px 12px', fontSize: 13.5, color: 'var(--muted)', opacity: 0.55, cursor: 'default',
          }}>{s}</span>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', padding: '2px 12px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.user.email}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', padding: '0 12px 8px' }}>
            {user.membership?.role ?? user.user.role}
          </div>
          <button onClick={onSignOut} style={{
            width: '100%', textAlign: 'left', padding: '7px 12px', border: 'none', borderRadius: 6,
            background: 'transparent', color: 'var(--ink-soft)', fontSize: 13,
          }}>Sign out</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', padding: 28, minWidth: 0 }}>{children}</main>

      {/* Slide rail */}
      <SlideRail />
    </div>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({
      position: 'relative', padding: '8px 12px', borderRadius: 6, fontSize: 13.5, fontWeight: 500,
      color: isActive ? 'var(--accent-deep)' : 'var(--ink-soft)',
      background: isActive ? 'var(--accent-wash)' : 'transparent',
    })}>{label}</NavLink>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--line-soft)', margin: '12px 8px' }} />;
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase', color: 'var(--muted)',
};

