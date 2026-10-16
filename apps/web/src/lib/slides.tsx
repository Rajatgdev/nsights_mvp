import { createContext, useCallback, useContext, useState } from 'react';

export interface Slide {
  id: string; title: string; kind: 'echarts' | 'table' | 'image';
  option?: unknown; table?: { head: string[]; rows: string[][] };
  imageUrl?: string; // for kind 'image' (author slides from Insights)
  fundIds: string[];
}
interface Ctx {
  slides: Slide[];
  add: (s: Omit<Slide, 'id'>) => void;
  remove: (id: string) => void;
  reorder: (from: number, to: number) => void;
  clear: () => void;
}
const SlideCtx = createContext<Ctx | null>(null);

export function SlideProvider({ children }: { children: React.ReactNode }) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const add = useCallback((s: Omit<Slide, 'id'>) => setSlides((p) => [...p, { ...s, id: crypto.randomUUID() }]), []);
  const remove = useCallback((id: string) => setSlides((p) => p.filter((x) => x.id !== id)), []);
  const reorder = useCallback((from: number, to: number) => setSlides((p) => {
    if (from === to || from < 0 || to < 0 || from >= p.length || to >= p.length) return p;
    const a = [...p];
    const [m] = a.splice(from, 1);
    a.splice(to, 0, m);
    return a;
  }), []);
  const clear = useCallback(() => setSlides([]), []);
  return <SlideCtx.Provider value={{ slides, add, remove, reorder, clear }}>{children}</SlideCtx.Provider>;
}
export function useSlides() {
  const c = useContext(SlideCtx);
  if (!c) throw new Error('useSlides outside provider');
  return c;
}