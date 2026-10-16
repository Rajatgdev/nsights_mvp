import PptxGenJS from 'pptxgenjs';
import * as echarts from 'echarts';
import type { Slide } from './slides';
import { recordPresentation, saveDeckBlob, downloadBlob } from './presentations';

const DEFAULT_DISCLAIMER = 'Past performance is not a reliable indicator of future results.';
const hex = (c: string | undefined, fallback: string) => (c ? c.replace('#', '') : fallback);

export interface ExportOpts {
  deep?: string;          // cover background (hex, with or without #)
  accent?: string;        // accent rule colour
  firmName?: string | null;
  adviserName?: string | null;
  adviserTitle?: string | null;
  tagline?: string | null;
  logo?: string | null;   // data URL
  showSlideNumbers?: boolean;
  disclaimerText?: string | null;
}

export async function exportPptx(slides: Slide[], opts: ExportOpts = {}) {
  const deep = hex(opts.deep, '103743');
  const accent = hex(opts.accent, '15a394');
  const disclaimer = (opts.disclaimerText && opts.disclaimerText.trim()) || DEFAULT_DISCLAIMER;
  const firm = (opts.firmName && opts.firmName.trim()) || 'Prepared by your firm';
  const adviser = [opts.adviserName, opts.adviserTitle].filter((x) => x && x.trim()).join(' · ');

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'N16x9', width: 10, height: 5.625 });
  pptx.layout = 'N16x9';

  // ---- Cover ----
  const cover = pptx.addSlide();
  cover.background = { color: deep };
  if (opts.logo) { try { cover.addImage({ data: opts.logo, x: 0.6, y: 0.5, w: 1.1, h: 0.55, sizing: { type: 'contain', w: 1.1, h: 0.55 } }); } catch { /* bad data URL — skip */ } }
  cover.addText('Client Presentation', { x: 0.6, y: 1.9, w: 8.8, h: 0.4, color: accent, fontSize: 15, bold: true, charSpacing: 2 });
  cover.addText(firm, { x: 0.6, y: 2.3, w: 8.8, h: 0.8, color: 'FFFFFF', fontSize: 34, bold: true });
  if (opts.tagline && opts.tagline.trim()) cover.addText(opts.tagline.trim(), { x: 0.6, y: 3.15, w: 8.8, h: 0.4, color: 'FFFFFF', fontSize: 15, transparency: 30 });
  cover.addShape('rect', { x: 0.62, y: 3.7, w: 1.4, h: 0.04, fill: { color: accent } });
  if (adviser) cover.addText(adviser, { x: 0.6, y: 4.7, w: 8.8, h: 0.4, color: 'FFFFFF', fontSize: 13, transparency: 25 });

  // ---- Content slides ----
  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const sl = pptx.addSlide();

    // Author slide (a page image from an Insights deck) → full-bleed, no chrome.
    if (s.kind === 'image' && s.imageUrl) {
      try {
        const data = await urlToDataUrl(s.imageUrl);
        sl.addImage({ data, x: 0, y: 0, w: 10, h: 5.625, sizing: { type: 'contain', w: 10, h: 5.625 } });
      } catch { sl.addText(s.title, { x: 0.5, y: 2.6, w: 9, h: 0.5, fontSize: 16, color: '103743', align: 'center' }); }
      if (opts.showSlideNumbers) sl.addText(String(i + 1), { x: 9.1, y: 5.2, w: 0.5, h: 0.3, fontSize: 9, color: '7B8A92', align: 'right' });
      continue;
    }

    sl.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 18, bold: true, color: '103743' });
    sl.addShape('rect', { x: 0.5, y: 0.78, w: 0.6, h: 0.03, fill: { color: accent } });
    if (s.kind === 'table' && s.table) {
      const header = s.table.head.map((h, ci) => ({ text: h, options: { bold: true, fill: { color: 'EAF3F0' }, color: '0B544A', align: (ci === 0 ? 'left' : 'right') as 'left' | 'right' } }));
      const body = s.table.rows.map((r) => r.map((c, ci) => ({ text: c, options: { align: (ci === 0 ? 'left' : 'right') as 'left' | 'right' } })));
      sl.addTable([header, ...body], { x: 0.5, y: 1.0, w: 9, fontSize: 11, color: '103737', border: { type: 'solid', color: 'E7E2D9', pt: 0.5 }, valign: 'middle' });
    } else {
      const img = await chartPng(s.option);
      sl.addImage({ data: img, x: 0.5, y: 0.95, w: 9, h: 4.0 });
    }
    sl.addText(disclaimer, { x: 0.5, y: 5.25, w: opts.showSlideNumbers ? 8.4 : 9, h: 0.3, fontSize: 8, color: '7B8A92' });
    if (opts.showSlideNumbers) sl.addText(String(i + 1), { x: 9.1, y: 5.2, w: 0.5, h: 0.3, fontSize: 9, color: '7B8A92', align: 'right' });
  }

  // ---- Back / disclaimer ----
  const end = pptx.addSlide();
  end.background = { color: deep };
  end.addText('Thank you', { x: 0.5, y: 2.1, w: 9, fontSize: 30, bold: true, color: 'FFFFFF', align: 'center' });
  end.addText(disclaimer, { x: 1, y: 3.1, w: 8, fontSize: 12, color: 'FFFFFF', transparency: 25, align: 'center' });

  const blob = (await pptx.write({ outputType: 'blob' })) as Blob;
  const id = recordPresentation('Client Presentation', slides.length);
  try { await saveDeckBlob(id, blob); } catch { /* keep the download even if persistence fails */ }
  downloadBlob(blob, 'nSights presentation.pptx');
}

// Fetch an image URL (public Vercel Blob) and return a data URL so pptxgenjs
// embeds the bytes rather than relying on a path fetch at build time.
async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

async function chartPng(option: unknown): Promise<string> {
  const div = document.createElement('div');
  div.style.cssText = 'width:1000px;height:460px;position:fixed;left:-99999px;top:0;background:#fff';
  document.body.appendChild(div);
  const inst = echarts.init(div, undefined, { renderer: 'canvas' });
  inst.setOption({ ...(option as object), animation: false });
  await new Promise((r) => setTimeout(r, 60));
  const url = inst.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#fff' });
  inst.dispose();
  div.remove();
  return url;
}