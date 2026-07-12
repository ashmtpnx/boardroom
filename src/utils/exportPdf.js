import { jsPDF } from 'jspdf';
import { incrementStat } from './badges';

// Export the current board to a PDF.
//
// We use Fabric's native canvas.toDataURL() rather than html2canvas: it reads
// the rendered bitmap directly and is far more reliable for a live <canvas>
// than rasterizing the DOM. (html2canvas remains a dependency for capturing
// arbitrary DOM if ever needed — see exportChatPdfAsImage notes in README.)
export function exportBoardPdf(fabricCanvas, filename = 'boardroom-board.pdf') {
  if (!fabricCanvas) return;

  const w = fabricCanvas.getWidth();
  const h = fabricCanvas.getHeight();
  const dataUrl = fabricCanvas.toDataURL({ format: 'png', multiplier: 2 });

  const orientation = w >= h ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const ratio = Math.min(pageW / w, pageH / h);
  const imgW = w * ratio;
  const imgH = h * ratio;
  const x = (pageW - imgW) / 2;
  const y = (pageH - imgH) / 2;

  pdf.addImage(dataUrl, 'PNG', x, y, imgW, imgH);
  pdf.save(filename);
  incrementStat('exportsDone', 1);
}

// Export the chat transcript as a selectable, auto-paginated text PDF.
export function exportChatPdf(messages = [], { room } = {}, filename = 'boardroom-chat.pdf') {
  incrementStat('exportsDone', 1);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const maxW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (lineHeight) => {
    if (y + lineHeight > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('BOARDROOM — Chat transcript', margin, y);
  y += 22;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(120);
  pdf.text(`Room: ${room || '—'}   •   Exported ${new Date().toLocaleString()}`, margin, y);
  y += 10;
  pdf.setDrawColor(220);
  pdf.line(margin, y, pageW - margin, y);
  y += 20;
  pdf.setTextColor(30);

  if (messages.length === 0) {
    pdf.setFontSize(11);
    pdf.text('No messages yet.', margin, y);
  }

  messages.forEach((m) => {
    const time = new Date(m.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ensureSpace(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(`${m.name || 'User'}  ·  ${time}`, margin, y);
    y += 16;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(m.text || '', maxW);
    lines.forEach((line) => {
      ensureSpace(15);
      pdf.text(line, margin, y);
      y += 15;
    });
    y += 8;
  });

  pdf.save(filename);
}
