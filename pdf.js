// Minimal PDF writer: each page holds one JPEG slice of the image.
const A4_WIDTH_PT = 595.28;

async function slicesToJpeg(canvases, pageRatio, quality) {
  const pages = [];
  for (const src of canvases) {
    const sliceH = Math.max(1, Math.round(src.width * pageRatio));
    for (let y = 0; y < src.height; y += sliceH) {
      const h = Math.min(sliceH, src.height - y);
      const tmp = new OffscreenCanvas(src.width, h);
      const ctx = tmp.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, src.width, h);
      ctx.drawImage(src, 0, -y);
      const blob = await tmp.convertToBlob({ type: 'image/jpeg', quality });
      pages.push({ data: new Uint8Array(await blob.arrayBuffer()), w: src.width, h });
    }
  }
  return pages;
}

export async function buildPdf(canvases, { pageRatio = Math.SQRT2, quality = 0.92 } = {}) {
  const pages = await slicesToJpeg(canvases, pageRatio, quality);
  const enc = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;
  const push = (d) => {
    const bytes = typeof d === 'string' ? enc.encode(d) : d;
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObj = (n) => { offsets[n] = length; push(`${n} 0 obj\n`); };
  const fmt = (n) => (Math.round(n * 100) / 100).toString();

  push('%PDF-1.4\n%âãÏÓ\n');

  const pageIds = pages.map((_, i) => 3 + i * 3);
  beginObj(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  beginObj(2);
  push(`<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>\nendobj\n`);

  pages.forEach((page, i) => {
    const pageId = 3 + i * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const pw = A4_WIDTH_PT;
    const ph = (A4_WIDTH_PT * page.h) / page.w;

    beginObj(pageId);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(pw)} ${fmt(ph)}] ` +
      `/Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );

    const content = `q ${fmt(pw)} 0 0 ${fmt(ph)} 0 0 cm /Im0 Do Q`;
    beginObj(contentId);
    push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);

    beginObj(imageId);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.w} /Height ${page.h} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.length} >>\nstream\n`
    );
    push(page.data);
    push('\nendstream\nendobj\n');
  });

  const count = 3 + pages.length * 3;
  const xrefAt = length;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (let n = 1; n < count; n++) xref += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
}
