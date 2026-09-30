(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  const TOOL_DEFS = [
    { id: 'merge', icon: 'fa-object-group' },
    { id: 'split', icon: 'fa-scissors' },
    { id: 'rotate', icon: 'fa-rotate' },
    { id: 'compress', icon: 'fa-compress' },
    { id: 'jpg2pdf', icon: 'fa-file-pdf' },
    { id: 'pdf2jpg', icon: 'fa-file-image' },
    { id: 'watermark', icon: 'fa-stamp' },
    { id: 'pagenumbers', icon: 'fa-list-ol' },
    { id: 'ocr', icon: 'fa-font' },
  ];
  function getTools() { return TOOL_DEFS.map((d) => ({ ...d, label: t('stn_pdf_' + d.id + '_label'), desc: t('stn_pdf_' + d.id + '_desc') })); }


  window.STN_MODULES.pdftools = async function (root) {
    root.innerHTML = `
      <div class="stn-grid stn-grid-3 mb-3" id="stnToolGrid"></div>
      <div id="stnToolPane"></div>
    `;
    const grid = document.getElementById('stnToolGrid');
    grid.innerHTML = getTools().map((tool) => `
      <div class="stn-card stn-card-tight" style="cursor:pointer" data-tool="${tool.id}">
        <i class="fa-solid ${tool.icon} text-emerald mb-2" style="font-size:1.2rem"></i>
        <div style="font-weight:700;font-size:.88rem">${tool.label}</div>
        <div class="text-soft" style="font-size:.76rem">${tool.desc}</div>
      </div>`).join('');
    grid.querySelectorAll('[data-tool]').forEach((card) => card.addEventListener('click', () => openTool(card.dataset.tool)));
  };

  function pane() { return document.getElementById('stnToolPane'); }
  function toolHeader(tool) {
    return `<div class="stn-card mb-3"><h3 class="mb-1"><i class="fa-solid ${tool.icon} text-cyan me-2"></i>${tool.label}</h3><p class="text-soft mb-0" style="font-size:.85rem">${tool.desc}</p></div>`;
  }
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const LIB_URLS = {
    PDFLib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    pdfjsLib: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    JSZip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    Tesseract: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/6.0.1/tesseract.min.js',
  };
  async function checkLibs(...names) {
    const missing = names.filter((n) => !window[n]);
    if (!missing.length) return true;
    STN.toast(`${t('stn_pdf_loading')} ${missing.join(', ')}…`);
    try {
      await STN.loadScripts(missing.map((n) => LIB_URLS[n]));
      if (missing.includes('pdfjsLib')) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
      return true;
    } catch (e) {
      STN.toast(t('stn_pdf_lib_load_failed'), 'error');
      return false;
    }
  }

  function openTool(id) {
    const tool = getTools().find((x) => x.id === id);
    const box = pane();
    box.innerHTML = toolHeader(tool) + renderers[id]();
    wireTool(id);
  }

  const renderers = {
    merge: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" multiple class="stn-input mb-3">
        <div id="stnFileOrder" class="mb-3 text-soft" style="font-size:.82rem"></div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-object-group"></i> ${t('stn_pdf_btn_merge')}</button>
      </div>`,
    split: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-scissors"></i> ${t('stn_pdf_btn_split')}</button>
      </div>`,
    rotate: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <div class="stn-field"><label class="stn-label">${t('stn_pdf_rotate_by')}</label>
          <select class="stn-select" id="stnRotateDeg"><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select>
        </div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-rotate"></i> ${t('stn_pdf_btn_rotate')}</button>
      </div>`,
    compress: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <div class="stn-field"><label class="stn-label">${t('stn_pdf_jpeg_quality')}</label><input type="range" min="20" max="90" value="55" id="stnQuality" class="w-100"></div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-compress"></i> ${t('stn_pdf_btn_compress')}</button>
      </div>`,
    jpg2pdf: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="image/jpeg,image/png" multiple class="stn-input mb-3">
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-file-pdf"></i> ${t('stn_pdf_btn_jpg2pdf')}</button>
      </div>`,
    pdf2jpg: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-file-image"></i> ${t('stn_pdf_btn_pdf2jpg')}</button>
      </div>`,
    watermark: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <div class="stn-field"><label class="stn-label">${t('stn_pdf_watermark_text')}</label><input class="stn-input" id="stnWmText" value="COPY"></div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-stamp"></i> ${t('stn_pdf_btn_watermark')}</button>
      </div>`,
    pagenumbers: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="application/pdf" class="stn-input mb-3">
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-list-ol"></i> ${t('stn_pdf_btn_pagenumbers')}</button>
      </div>`,
    ocr: () => `
      <div class="stn-card">
        <input type="file" id="stnFiles" accept="image/*,application/pdf" class="stn-input mb-3">
        <div class="stn-field"><label class="stn-label">${t('stn_pdf_language')}</label>
          <select class="stn-select" id="stnOcrLang"><option value="eng">English</option><option value="swa">Kiswahili</option></select>
        </div>
        <button class="stn-btn stn-btn-primary" id="stnRun"><i class="fa-solid fa-font"></i> ${t('stn_pdf_btn_ocr')}</button>
        <div id="stnOcrProgress" class="text-soft mt-2" style="font-size:.8rem"></div>
        <textarea class="stn-textarea mt-3" id="stnOcrOut" rows="8" placeholder="${t('stn_pdf_ocr_placeholder')}"></textarea>
        <button class="stn-btn stn-btn-outline stn-btn-sm mt-2" id="stnOcrDownload" style="display:none"><i class="fa-solid fa-download"></i> ${t('stn_pdf_btn_download_txt')}</button>
      </div>`,
  };

  async function pdfToPageCanvases(arrayBuffer, scale) {
    if (!(await checkLibs('pdfjsLib'))) return [];
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const canvases = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: scale || 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      canvases.push(canvas);
    }
    return canvases;
  }

  function wireTool(id) {
    document.getElementById('stnRun')?.addEventListener('click', () => runTool(id));
  }

  async function runTool(id) {
    const btn = document.getElementById('stnRun');
    const files = document.getElementById('stnFiles')?.files;
    if (!files || !files.length) return STN.toast(t('stn_pdf_choose_file_first'), 'error');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="stn-spin" style="width:16px;height:16px;border-width:2px"></div>'; }
    try {
      await HANDLERS[id](files);
    } catch (err) {
      console.error(err);
      STN.toast(t('stn_pdf_something_wrong') + ' ' + err.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; const tl = TOOL_DEFS.find((x) => x.id === id); btn.innerHTML = `<i class="fa-solid ${tl.icon}"></i> ${t('stn_pdf_run_again')}`; }
    }
  }

  const HANDLERS = {
    async merge(files) {
      if (!(await checkLibs('PDFLib'))) return;
      const { PDFDocument } = window.PDFLib;
      const out = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const src = await PDFDocument.load(bytes);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'merged.pdf');
      STN.toast(t('stn_pdf_merged_done'));
    },

    async split(files) {
      if (!(await checkLibs('PDFLib', 'JSZip'))) return;
      const { PDFDocument } = window.PDFLib;
      const bytes = await files[0].arrayBuffer();
      const src = await PDFDocument.load(bytes);
      const zip = new window.JSZip();
      for (let i = 0; i < src.getPageCount(); i++) {
        const out = await PDFDocument.create();
        const [page] = await out.copyPages(src, [i]);
        out.addPage(page);
        const pageBytes = await out.save();
        zip.file(`page-${i + 1}.pdf`, pageBytes);
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'split-pages.zip');
      STN.toast(t('stn_pdf_split_done'));
    },

    async rotate(files) {
      if (!(await checkLibs('PDFLib'))) return;
      const { PDFDocument, degrees } = window.PDFLib;
      const deg = Number(document.getElementById('stnRotateDeg').value);
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      doc.getPages().forEach((p) => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
      const out = await doc.save();
      downloadBlob(new Blob([out], { type: 'application/pdf' }), 'rotated.pdf');
      STN.toast(t('stn_pdf_rotate_done'));
    },

    async compress(files) {
      if (!(await checkLibs('PDFLib', 'pdfjsLib'))) return;
      const quality = Number(document.getElementById('stnQuality').value) / 100;
      const bytes = await files[0].arrayBuffer();
      const canvases = await pdfToPageCanvases(bytes, 1.5);
      const { PDFDocument } = window.PDFLib;
      const out = await PDFDocument.create();
      for (const canvas of canvases) {
        const jpeg = canvas.toDataURL('image/jpeg', quality);
        const jpgBytes = await (await fetch(jpeg)).arrayBuffer();
        const img = await out.embedJpg(jpgBytes);
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const pdfBytes = await out.save();
      downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'compressed.pdf');
      STN.toast(`${t('stn_pdf_compressed')}: ${(bytes.byteLength / 1024).toFixed(0)}KB → ${(pdfBytes.byteLength / 1024).toFixed(0)}KB`);
    },

    async jpg2pdf(files) {
      if (!(await checkLibs('PDFLib'))) return;
      const { PDFDocument } = window.PDFLib;
      const out = await PDFDocument.create();
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const img = file.type === 'image/png' ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const page = out.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      }
      const bytes = await out.save();
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'images.pdf');
      STN.toast(t('stn_pdf_jpg2pdf_done'));
    },

    async pdf2jpg(files) {
      const bytes = await files[0].arrayBuffer();
      const canvases = await pdfToPageCanvases(bytes, 2);
      if (canvases.length === 1) {
        canvases[0].toBlob((blob) => downloadBlob(blob, 'page-1.jpg'), 'image/jpeg', 0.92);
        STN.toast(t('stn_pdf_jpg_done'));
        return;
      }
      if (!(await checkLibs('JSZip'))) return;
      const zip = new window.JSZip();
      for (let i = 0; i < canvases.length; i++) {
        const dataUrl = canvases[i].toDataURL('image/jpeg', 0.92);
        zip.file(`page-${i + 1}.jpg`, dataUrl.split(',')[1], { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(blob, 'pdf-pages.zip');
      STN.toast(`${canvases.length} ${t('stn_pdf_n_pages_zip')}`);
    },

    async watermark(files) {
      if (!(await checkLibs('PDFLib'))) return;
      const { PDFDocument, rgb, degrees } = window.PDFLib;
      const text = document.getElementById('stnWmText').value || 'COPY';
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(window.PDFLib.StandardFonts.HelveticaBold);
      doc.getPages().forEach((page) => {
        const { width, height } = page.getSize();
        page.drawText(text, {
          x: width / 2 - (text.length * 14), y: height / 2, size: 48, font,
          color: rgb(0.6, 0.6, 0.6), opacity: 0.25, rotate: degrees(35),
        });
      });
      const out = await doc.save();
      downloadBlob(new Blob([out], { type: 'application/pdf' }), 'watermarked.pdf');
      STN.toast(t('stn_pdf_wm_done'));
    },

    async pagenumbers(files) {
      if (!(await checkLibs('PDFLib'))) return;
      const { PDFDocument, rgb } = window.PDFLib;
      const bytes = await files[0].arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(window.PDFLib.StandardFonts.Helvetica);
      const pages = doc.getPages();
      pages.forEach((page, i) => {
        const { width } = page.getSize();
        page.drawText(`${i + 1} / ${pages.length}`, { x: width / 2 - 15, y: 18, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
      });
      const out = await doc.save();
      downloadBlob(new Blob([out], { type: 'application/pdf' }), 'numbered.pdf');
      STN.toast(t('stn_pdf_pn_done'));
    },

    async ocr(files) {
      if (!(await checkLibs('Tesseract'))) return;
      const lang = document.getElementById('stnOcrLang').value;
      const progressEl = document.getElementById('stnOcrProgress');
      const file = files[0];
      let imageSource;
      if (file.type === 'application/pdf') {
        const canvases = await pdfToPageCanvases(await file.arrayBuffer(), 2);
        imageSource = canvases[0].toDataURL('image/png');
      } else {
        imageSource = URL.createObjectURL(file);
      }
      const worker = await window.Tesseract.createWorker(lang, 1, {
        logger: (m) => { if (m.status && typeof m.progress === 'number') progressEl.textContent = `${m.status}… ${Math.round(m.progress * 100)}%`; },
      });
      const { data } = await worker.recognize(imageSource);
      await worker.terminate();
      document.getElementById('stnOcrOut').value = data.text;
      progressEl.textContent = t('stn_pdf_done');
      const dl = document.getElementById('stnOcrDownload');
      dl.style.display = '';
      dl.onclick = () => downloadBlob(new Blob([data.text], { type: 'text/plain' }), 'extracted-text.txt');
      STN.toast(t('stn_pdf_ocr_done'));
    },
  };
})();
