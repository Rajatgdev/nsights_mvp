import PptxGenJS from 'pptxgenjs';
import * as echarts from 'echarts';
import type { Slide } from './slides';

const DISCLAIMER = 'Past performance is not a reliable indicator of future results.';

export async function exportPptx(slides: Slide[], firm = 'Prepared by your firm') {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'N16x9', width: 10, height: 5.625 });
  pptx.layout = 'N16x9';

  // Cover
  const cover = pptx.addSlide();
  cover.background = { color: '103743' };
  cover.addText('Client Presentation', { x: 0.6, y: 2.0, w: 8.8, h: 0.8, color: 'FFFFFF', fontSize: 34, bold: true });
  cover.addText(firm, { x: 0.6, y: 2.9, w: 8.8, h: 0.5, color: 'A9C4BE', fontSize: 15 });

  // Content slides
  for (const s of slides) {
    const sl = pptx.addSlide();
    sl.addText(s.title, { x: 0.5, y: 0.3, w: 9, h: 0.5, fontSize: 18, bold: true, color: '103743' });
    if (s.kind === 'table' && s.table) {
      const header = s.table.head.map((h, i) => ({ text: h, options: { bold: true, fill: { color: 'EAF3F0' }, color: '0B544A', align: (i === 0 ? 'left' : 'right') as 'left' | 'right' } }));
      const body = s.table.rows.map((r) => r.map((c, ci) => ({ text: c, options: { align: (ci === 0 ? 'left' : 'right') as 'left' | 'right' } })));
      sl.addTable([header, ...body], { x: 0.5, y: 1.0, w: 9, fontSize: 11, color: '103737', border: { type: 'solid', color: 'E7E2D9', pt: 0.5 }, valign: 'middle' });
    } else {
      const img = await chartPng(s.option);
      sl.addImage({ data: img, x: 0.5, y: 0.95, w: 9, h: 4.0 });
    }
    sl.addText(DISCLAIMER, { x: 0.5, y: 5.25, w: 9, h: 0.3, fontSize: 8, color: '7B8A92' });
  }

  // Closing / disclaimer
  const end = pptx.addSlide();
  end.addText('Disclaimer', { x: 0.5, y: 0.5, w: 9, fontSize: 18, bold: true, color: '103743' });
  end.addText(DISCLAIMER, { x: 0.5, y: 1.3, w: 9, fontSize: 13, color: '3F5560' });

  await pptx.writeFile({ fileName: `nSights presentation.pptx` });
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