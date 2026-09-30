(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  const st = {
    img: null, presets: [], preset: null,
    offX: 0, offY: 0, scale: 1, // offX/offY are fractions of canvas width/height
    brightness: 100, contrast: 100, sharpen: 0,
    bgColor: '#FFFFFF', tolerance: 32,
    workingImageData: null, // ImageData after bg removal, at natural image resolution
  };

  window.STN_MODULES.photostudio = async function (root) {
    const { presets } = await STN.api.get('/photo-presets');
    st.presets = presets;
    st.preset = presets[0];
    resetTransform();

    root.innerHTML = `
      <div class="stn-grid" style="grid-template-columns: 1fr 340px; align-items:flex-start">
        <div class="stn-card">
          <div class="stn-card-head">
            <h3><i class="fa-solid fa-camera-retro me-1"></i>${t('stn_ps_title')}</h3>
            <input type="file" accept="image/*" id="stnPhotoFile" class="d-none">
            <button class="stn-btn stn-btn-primary stn-btn-sm" id="stnPhotoUploadBtn"><i class="fa-solid fa-upload"></i> ${t('stn_ps_upload_photo')}</button>
          </div>
          <div class="stn-photo-stage"><canvas id="stnPhotoCanvas" width="360" height="450"></canvas></div>
          <div class="d-flex justify-content-between text-soft mt-2" style="font-size:.78rem" id="stnPhotoDims">—</div>

          <div class="stn-grid stn-grid-2 mt-3">
            <div class="stn-field"><label class="stn-label">${t('stn_ps_zoom')}</label><input type="range" min="0.5" max="3" step="0.01" value="1" id="stnZoom" class="w-100"></div>
            <div class="stn-field"><label class="stn-label">${t('stn_ps_sharpen')}</label><input type="range" min="0" max="100" value="0" id="stnSharpen" class="w-100"></div>
            <div class="stn-field"><label class="stn-label">${t('stn_ps_brightness')}</label><input type="range" min="50" max="150" value="100" id="stnBrightness" class="w-100"></div>
            <div class="stn-field"><label class="stn-label">${t('stn_ps_contrast')}</label><input type="range" min="50" max="150" value="100" id="stnContrast" class="w-100"></div>
          </div>
          <p class="text-soft mb-0" style="font-size:.76rem"><i class="fa-solid fa-arrows-up-down-left-right me-1"></i>${t('stn_ps_drag_hint')}</p>
        </div>

        <div class="d-flex flex-column gap-3">
          <div class="stn-card">
            <div class="stn-card-head"><h3>${t('stn_ps_preset')}</h3></div>
            <select class="stn-select mb-2" id="stnPresetSelect"></select>
            <div class="text-soft" style="font-size:.78rem" id="stnPresetInfo"></div>
          </div>

          <div class="stn-card">
            <div class="stn-card-head"><h3>${t('stn_ps_background')}</h3></div>
            <div class="d-flex gap-2 mb-2">
              <span class="stn-swatch active" style="background:#fff" data-bg="#FFFFFF"></span>
              <span class="stn-swatch" style="background:#1d4ed8" data-bg="#1d4ed8"></span>
              <span class="stn-swatch" style="background:#dc2626" data-bg="#dc2626"></span>
              <input type="color" id="stnBgCustom" value="#ffffff" style="width:28px;height:28px;border-radius:.5rem;border:none;padding:0">
            </div>
            <div class="stn-field"><label class="stn-label">${t('stn_ps_tolerance')}</label><input type="range" min="5" max="80" value="32" id="stnTolerance" class="w-100"></div>
            <button class="stn-btn stn-btn-outline stn-btn-sm w-100" id="stnBgRemove"><i class="fa-solid fa-wand-magic-sparkles"></i> ${t('stn_ps_click_bg_remove')}</button>
            <p class="text-soft mt-2 mb-0" style="font-size:.72rem">${t('stn_ps_bg_hint')}</p>
          </div>

          <div class="stn-card">
            <div class="stn-card-head"><h3>${t('stn_ps_export')}</h3></div>
            <div class="stn-field"><label class="stn-label">${t('stn_ps_a4_layout')}</label>
              <select class="stn-select" id="stnLayoutCount"><option value="1">${t('stn_ps_single_photo')}</option><option value="4">4 ${t('stn_ps_per_a4')}</option><option value="6" selected>6 ${t('stn_ps_per_a4')}</option><option value="8">8 ${t('stn_ps_per_a4')}</option><option value="12">12 ${t('stn_ps_per_a4')}</option></select>
            </div>
            <div class="d-flex flex-column gap-2">
              <button class="stn-btn stn-btn-primary" id="stnExportPng"><i class="fa-solid fa-file-image"></i> ${t('stn_ps_export_png')}</button>
              <button class="stn-btn stn-btn-outline" id="stnExportJpg"><i class="fa-solid fa-file-image"></i> ${t('stn_ps_export_jpeg')}</button>
              <button class="stn-btn stn-btn-outline" id="stnExportPdf"><i class="fa-solid fa-file-pdf"></i> ${t('stn_ps_export_pdf')}</button>
            </div>
          </div>
        </div>
      </div>
      <div class="mt-3" id="stnPhotoResult"></div>
    `;

    populatePresetSelect();
    wireUploader();
    wireControls();
    resizeCanvasToPreset();
    draw();
  };

  function resetTransform() { st.offX = 0; st.offY = 0; st.scale = 1; st.workingImageData = null; st.brightness = 100; st.contrast = 100; st.sharpen = 0; }

  function populatePresetSelect() {
    const sel = document.getElementById('stnPresetSelect');
    sel.innerHTML = st.presets.map((p, i) => `<option value="${i}">${STN.esc(p.country)} — ${STN.esc(p.name)}</option>`).join('');
    sel.addEventListener('change', () => {
      st.preset = st.presets[Number(sel.value)];
      resizeCanvasToPreset();
      updatePresetInfo();
      draw();
    });
    updatePresetInfo();
  }

  function pxFor(mm, dpi) { return Math.round((mm / 25.4) * dpi); }

  function updatePresetInfo() {
    const p = st.preset;
    const w = pxFor(p.width_mm, p.dpi), h = pxFor(p.height_mm, p.dpi);
    document.getElementById('stnPresetInfo').innerHTML = `${p.width_mm}×${p.height_mm} mm · ${p.dpi} DPI · <strong>${w}×${h} px</strong><br>${t('stn_ps_face_height')} ${p.face_min_pct}–${p.face_max_pct}% ${t('stn_ps_of_frame')}${p.notes ? '<br>' + STN.esc(p.notes) : ''}`;
    document.getElementById('stnPhotoDims').textContent = `${t('stn_ps_output')}: ${w}×${h}px (${p.width_mm}×${p.height_mm}mm @ ${p.dpi}dpi)`;
  }

  function resizeCanvasToPreset() {
    const canvas = document.getElementById('stnPhotoCanvas');
    const aspect = st.preset.width_mm / st.preset.height_mm;
    const displayH = 420;
    canvas.height = displayH;
    canvas.width = Math.round(displayH * aspect);
  }

  function wireUploader() {
    const fileInput = document.getElementById('stnPhotoFile');
    document.getElementById('stnPhotoUploadBtn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        st.img = img;
        resetTransform();
        detectFaceIfPossible(img);
        draw();
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function detectFaceIfPossible(img) {
    if (!('FaceDetector' in window)) return; // graceful fallback: manual guide only
    try {
      const detector = new window.FaceDetector({ maxDetectedFaces: 1 });
      const faces = await detector.detect(img);
      if (!faces.length) return;
      const box = faces[0].boundingBox;
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
      const canvas = document.getElementById('stnPhotoCanvas');
      const targetFaceFrac = (st.preset.face_min_pct + st.preset.face_max_pct) / 200;
      const coverScale = Math.max(canvas.width / img.width, canvas.height / img.height);
      const desiredScale = (canvas.height * targetFaceFrac) / (box.height * coverScale);
      st.scale = Math.min(3, Math.max(0.5, desiredScale));
      st.offX = (img.width / 2 - cx) / img.width;
      st.offY = (img.height / 2 - cy) / img.height * 0.6; // gentle pull, keep some headroom
      document.getElementById('stnZoom').value = st.scale;
      STN.toast(t('stn_ps_face_detected'));
    } catch (e) { /* no worries — manual alignment still works */ }
  }

  function wireControls() {
    const canvas = document.getElementById('stnPhotoCanvas');
    let dragging = false, lastX = 0, lastY = 0;
    canvas.addEventListener('mousedown', (e) => { dragging = true; lastX = e.offsetX; lastY = e.offsetY; });
    window.addEventListener('mouseup', () => dragging = false);
    canvas.addEventListener('mousemove', (e) => {
      if (!dragging || !st.img) return;
      st.offX += (e.offsetX - lastX) / canvas.width;
      st.offY += (e.offsetY - lastY) / canvas.height;
      lastX = e.offsetX; lastY = e.offsetY;
      draw();
    });
    canvas.addEventListener('touchstart', (e) => { const t = e.touches[0]; lastX = t.clientX; lastY = t.clientY; dragging = true; }, { passive: true });
    canvas.addEventListener('touchmove', (e) => {
      if (!dragging || !st.img) return;
      const t = e.touches[0];
      st.offX += (t.clientX - lastX) / canvas.width;
      st.offY += (t.clientY - lastY) / canvas.height;
      lastX = t.clientX; lastY = t.clientY;
      draw();
    }, { passive: true });
    canvas.addEventListener('touchend', () => dragging = false);

    document.getElementById('stnZoom').addEventListener('input', (e) => { st.scale = Number(e.target.value); draw(); });
    document.getElementById('stnSharpen').addEventListener('input', (e) => { st.sharpen = Number(e.target.value); draw(); });
    document.getElementById('stnBrightness').addEventListener('input', (e) => { st.brightness = Number(e.target.value); draw(); });
    document.getElementById('stnContrast').addEventListener('input', (e) => { st.contrast = Number(e.target.value); draw(); });
    document.getElementById('stnTolerance').addEventListener('input', (e) => { st.tolerance = Number(e.target.value); });

    document.querySelectorAll('.stn-swatch[data-bg]').forEach((sw) => sw.addEventListener('click', () => {
      document.querySelectorAll('.stn-swatch').forEach((s) => s.classList.remove('active'));
      sw.classList.add('active');
      st.bgColor = sw.dataset.bg;
      draw();
    }));
    document.getElementById('stnBgCustom').addEventListener('input', (e) => {
      document.querySelectorAll('.stn-swatch').forEach((s) => s.classList.remove('active'));
      st.bgColor = e.target.value;
      draw();
    });

    let removeMode = false;
    document.getElementById('stnBgRemove').addEventListener('click', () => {
      if (!st.img) return STN.toast(t('stn_ps_upload_first'), 'error');
      removeMode = !removeMode;
      document.getElementById('stnBgRemove').classList.toggle('stn-btn-primary', removeMode);
      STN.toast(removeMode ? t('stn_ps_bg_tool_on') : t('stn_ps_bg_tool_off'));
    });
    canvas.addEventListener('click', (e) => {
      if (!removeMode || !st.img) return;
      floodRemoveAt(e.offsetX, e.offsetY, canvas);
    });

    document.getElementById('stnExportPng').addEventListener('click', () => exportImage('png'));
    document.getElementById('stnExportJpg').addEventListener('click', () => exportImage('jpeg'));
    document.getElementById('stnExportPdf').addEventListener('click', exportPdf);
  }

  // ---------------- Core draw pipeline (used for preview AND export) ----------------
  function drawInto(ctx, w, h) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = st.bgColor;
    ctx.fillRect(0, 0, w, h);
    if (st.img) {
      const source = st.workingImageData ? imageDataToCanvas(st.workingImageData) : st.img;
      const sw = source.width, sh = source.height;
      const cover = Math.max(w / sw, h / sh) * st.scale;
      const drawW = sw * cover, drawH = sh * cover;
      const cx = w / 2 + st.offX * w, cy = h / 2 + st.offY * h;
      ctx.filter = `brightness(${st.brightness}%) contrast(${st.contrast}%)`;
      ctx.drawImage(source, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      ctx.filter = 'none';
    }
    ctx.restore();
    if (st.sharpen > 0) applySharpen(ctx, w, h, st.sharpen / 100);
  }

  function draw() {
    const canvas = document.getElementById('stnPhotoCanvas');
    const ctx = canvas.getContext('2d');
    drawInto(ctx, canvas.width, canvas.height);
    drawFaceGuide(ctx, canvas.width, canvas.height);
  }

  function drawFaceGuide(ctx, w, h) {
    const minH = h * (st.preset.face_min_pct / 100);
    const maxH = h * (st.preset.face_max_pct / 100);
    const cx = w / 2, topY = h * 0.14;
    ctx.save();
    ctx.strokeStyle = 'rgba(16,185,129,0.85)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, topY + maxH / 2, maxH * 0.34, maxH / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(6,182,212,0.55)';
    ctx.beginPath();
    ctx.ellipse(cx, topY + minH / 2, minH * 0.34, minH / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function imageDataToCanvas(imageData) {
    const c = document.createElement('canvas');
    c.width = imageData.width; c.height = imageData.height;
    c.getContext('2d').putImageData(imageData, 0, 0);
    return c;
  }

  // ---------------- Background removal (flood-fill "magic wand") ----------------
  function floodRemoveAt(clickX, clickY, canvas) {
    const source = st.workingImageData ? imageDataToCanvas(st.workingImageData) : st.img;
    const sw = source.width, sh = source.height;
    const cover = Math.max(canvas.width / sw, canvas.height / sh) * st.scale;
    const drawW = sw * cover, drawH = sh * cover;
    const originX = canvas.width / 2 + st.offX * canvas.width - drawW / 2;
    const originY = canvas.height / 2 + st.offY * canvas.height - drawH / 2;
    const imgX = Math.round((clickX - originX) / cover);
    const imgY = Math.round((clickY - originY) / cover);
    if (imgX < 0 || imgY < 0 || imgX >= sw || imgY >= sh) return;

    const work = document.createElement('canvas');
    work.width = sw; work.height = sh;
    const wctx = work.getContext('2d');
    wctx.drawImage(source, 0, 0);
    const imageData = wctx.getImageData(0, 0, sw, sh);
    const data = imageData.data;
    const idx = (imgY * sw + imgX) * 4;
    const target = [data[idx], data[idx + 1], data[idx + 2]];
    const tol = st.tolerance;
    const visited = new Uint8Array(sw * sh);
    const stack = [[imgX, imgY]];

    while (stack.length) {
      const [x, y] = stack.pop();
      if (x < 0 || y < 0 || x >= sw || y >= sh) continue;
      const p = y * sw + x;
      if (visited[p]) continue;
      visited[p] = 1;
      const i = p * 4;
      const dist = Math.sqrt((data[i] - target[0]) ** 2 + (data[i + 1] - target[1]) ** 2 + (data[i + 2] - target[2]) ** 2);
      if (dist > tol) continue;
      data[i + 3] = 0; // make transparent
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    st.workingImageData = imageData;
    draw();
    STN.toast(t('stn_ps_bg_removed'));
  }

  // ---------------- Sharpen (simple unsharp mask convolution) ----------------
  function applySharpen(ctx, w, h, amount) {
    const imageData = ctx.getImageData(0, 0, w, h);
    const src = imageData.data;
    const out = new Uint8ClampedArray(src);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0, k = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const p = ((y + ky) * w + (x + kx)) * 4 + c;
              sum += src[p] * kernel[k++];
            }
          }
          const p0 = (y * w + x) * 4 + c;
          out[p0] = src[p0] * (1 - amount) + sum * amount;
        }
      }
    }
    imageData.data.set(out);
    ctx.putImageData(imageData, 0, 0);
  }

  // ---------------- Export ----------------
  function renderExportCanvas() {
    const w = pxFor(st.preset.width_mm, st.preset.dpi);
    const h = pxFor(st.preset.height_mm, st.preset.dpi);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    drawInto(canvas.getContext('2d'), w, h);
    return canvas;
  }

  function renderA4Sheet(photoCanvas, count) {
    const A4W = pxFor(210, 300), A4H = pxFor(297, 300); // 2480x3508 @300dpi
    const sheet = document.createElement('canvas');
    sheet.width = A4W; sheet.height = A4H;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, A4W, A4H);

    const layout = { 1: [1, 1], 4: [2, 2], 6: [3, 2], 8: [4, 2], 12: [4, 3] }[count] || [2, 2];
    const [gCols, gRows] = layout;
    const margin = pxFor(8, 300), gap = pxFor(4, 300);
    const cellW = (A4W - margin * 2 - gap * (gCols - 1)) / gCols;
    const cellH = (A4H - margin * 2 - gap * (gRows - 1)) / gRows;
    const scale = Math.min(cellW / photoCanvas.width, cellH / photoCanvas.height);
    const pw = photoCanvas.width * scale, ph = photoCanvas.height * scale;

    ctx.strokeStyle = '#cbd5e1'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
    let n = 0;
    for (let r = 0; r < gRows && n < count; r++) {
      for (let c = 0; c < gCols && n < count; c++, n++) {
        const x = margin + c * (cellW + gap) + (cellW - pw) / 2;
        const y = margin + r * (cellH + gap) + (cellH - ph) / 2;
        ctx.drawImage(photoCanvas, x, y, pw, ph);
        ctx.strokeRect(x - 2, y - 2, pw + 4, ph + 4);
      }
    }
    return sheet;
  }

  function exportImage(format) {
    if (!st.img) return STN.toast(t('stn_ps_upload_first'), 'error');
    const photoCanvas = renderExportCanvas();
    const count = Number(document.getElementById('stnLayoutCount').value);
    const finalCanvas = count > 1 ? renderA4Sheet(photoCanvas, count) : photoCanvas;
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const url = finalCanvas.toDataURL(mime, 0.95);
    const a = document.createElement('a');
    a.href = url; a.download = `passport-photo-${st.preset.country}.${format === 'png' ? 'png' : 'jpg'}`;
    a.click();
    showResultPreview(finalCanvas);
  }

  async function exportPdf() {
    if (!st.img) return STN.toast(t('stn_ps_upload_first'), 'error');
    if (!window.jspdf) {
      STN.toast(t('stn_ps_loading_pdf'));
      try { await STN.loadScripts(['https://cdnjs.cloudflare.com/ajax/libs/jspdf/4.2.1/jspdf.umd.min.js']); }
      catch (e) { return STN.toast(t('stn_ps_pdf_lib_failed'), 'error'); }
    }
    const photoCanvas = renderExportCanvas();
    const count = Number(document.getElementById('stnLayoutCount').value);
    const finalCanvas = count > 1 ? renderA4Sheet(photoCanvas, count) : photoCanvas;
    const { jsPDF } = window.jspdf;
    const isA4 = count > 1;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: isA4 ? 'a4' : [st.preset.width_mm, st.preset.height_mm] });
    const imgData = finalCanvas.toDataURL('image/jpeg', 0.95);
    if (isA4) pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
    else pdf.addImage(imgData, 'JPEG', 0, 0, st.preset.width_mm, st.preset.height_mm);
    pdf.save(`passport-photo-${st.preset.country}.pdf`);
    showResultPreview(finalCanvas);
  }

  function showResultPreview(canvas) {
    const box = document.getElementById('stnPhotoResult');
    box.innerHTML = `<div class="stn-card"><div class="stn-card-head"><h3>${t('stn_ps_export_preview')}</h3></div><div class="text-center"><img src="${canvas.toDataURL('image/jpeg', 0.9)}" style="max-width:100%;border-radius:.6rem;border:1px solid var(--stn-border)"></div></div>`;
  }
})();
