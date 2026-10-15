import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './screens/Dashboard';
import { Research } from './screens/Research';
import { Portfolio } from './screens/Portfolio';
import { Insights } from './screens/Insights';
import { Design } from './screens/Design';
import { Settings } from './screens/Settings';

// App shell = top nav (prototype look) + the slide rail on the right.
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/research" element={<Research />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/design" element={<Design />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  );
}
