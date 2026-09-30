/* Smart21Brain — Admin "Post Video" uploader
   A YouTube-Studio-style flow: drag & drop (or pick) a file, preview it,
   auto-generate thumbnail frames, fill in details, choose visibility
   (placements), then upload with a live progress bar. Talks to the same
   /api/videos endpoint as before (multipart/form-data with a "file" field). */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('yts-dropzone');
    if (!dropzone) return; // not on the admin page

    const fileInput = document.getElementById('yts-file-input');
    const selectBtn = document.getElementById('yts-select-btn');
    const urlToggle = document.getElementById('yts-url-toggle');
    const urlForm = document.getElementById('admin-video-url-form');

    const overlay = document.getElementById('yts-modal-overlay');
    const modalFilename = document.getElementById('yts-modal-filename');
    const modalStatus = document.getElementById('yts-modal-status');
    const progressBar = document.getElementById('yts-modal-progress-bar');
    const stepsWrap = document.getElementById('yts-modal-steps');
    const panes = document.querySelectorAll('.yts-step-pane');
    const closeBtn = document.getElementById('yts-modal-close');
    const backBtn = document.getElementById('yts-back-btn');
    const nextBtn = document.getElementById('yts-next-btn');
    const publishBtn = document.getElementById('yts-publish-btn');
    const footerStatus = document.getElementById('yts-footer-status');
    const doneWrap = document.getElementById('yts-done');
    const doneCloseBtn = document.getElementById('yts-done-close');
    const modalBody = document.querySelector('.yts-modal-body');
    const modalFooter = document.getElementById('yts-modal-footer');

    const titleInput = document.getElementById('yts-title');
    const titleCount = document.getElementById('yts-title-count');
    const descInput = document.getElementById('yts-description');
    const subjectInput = document.getElementById('yts-subject');
    const thumbGrid = document.getElementById('yts-thumb-grid');
    const thumbUploadTile = document.getElementById('yts-thumb-upload-tile');
    const thumbFileInput = document.getElementById('yts-thumb-file-input');

    const previewVideo = document.getElementById('yts-preview-video');
    const metaFilename = document.getElementById('yts-meta-filename');
    const metaSize = document.getElementById('yts-meta-size');
    const metaDuration = document.getElementById('yts-meta-duration');

    let currentFile = null;
    let selectedThumbnail = ''; // data URL
    let currentStep = 'details';

    function formatBytes(bytes) {
      if (!bytes) return '—';
      const units = ['B', 'KB', 'MB', 'GB'];
      let i = 0, n = bytes;
      while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
      return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
    }
    function formatDuration(seconds) {
      if (!seconds || !isFinite(seconds)) return '—';
      const m = Math.floor(seconds / 60);
      const s = Math.round(seconds % 60);
      return `${m}:${String(s).padStart(2, '0')}`;
    }

    // ---- Drag & drop / file picking ----
    selectBtn?.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('click', (e) => {
      if (e.target === urlToggle || urlToggle?.contains(e.target)) return;
      fileInput.click();
    });
    ['dragenter', 'dragover'].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('yts-dragover'); }));
    ['dragleave', 'drop'].forEach((evt) =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('yts-dragover'); }));
    dropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files?.[0];
      if (file) startUpload(file);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files?.[0]) startUpload(fileInput.files[0]);
    });

    urlToggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      urlForm.classList.toggle('d-none');
    });

    // ---- Start a new upload: open modal, load preview + generate thumbs ----
    function startUpload(file) {
      const allowed = ['video/mp4', 'video/webm', 'video/ogg'];
      if (!allowed.includes(file.type)) {
        alert('Please choose an MP4, WebM or OGG video file.');
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        alert('That file is larger than 100MB. Use "paste a link instead" for bigger files.');
        return;
      }

      currentFile = file;
      selectedThumbnail = '';
      currentStep = 'details';
      resetModalUI();

      const baseName = file.name.replace(/\.[^.]+$/, '');
      titleInput.value = baseName;
      titleCount.textContent = `${titleInput.value.length}/100`;
      descInput.value = '';
      subjectInput.value = '';
      modalFilename.textContent = file.name;
      modalStatus.textContent = 'Ready to publish — fill in the details below.';
      metaFilename.textContent = file.name;
      metaSize.textContent = formatBytes(file.size);
      metaDuration.textContent = '—';

      const objectUrl = URL.createObjectURL(file);
      previewVideo.src = objectUrl;
      previewVideo.addEventListener('loadedmetadata', () => {
        metaDuration.textContent = formatDuration(previewVideo.duration);
        generateThumbnails(previewVideo);
      }, { once: true });

      overlay.classList.remove('d-none');
    }

    // Capture three frames (25% / 50% / 75% through the video) onto a canvas
    // to offer as auto-generated thumbnail choices, the way YouTube Studio does.
    function generateThumbnails(video) {
      const fractions = [0.25, 0.5, 0.75];
      const canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 180;
      const ctx = canvas.getContext('2d');
      const wasMuted = video.muted;
      video.muted = true;

      // Remove any previously generated frame tiles (keep the upload tile).
      thumbGrid.querySelectorAll('.yts-thumb-frame').forEach((el) => el.remove());

      let i = 0;
      function captureNext() {
        if (i >= fractions.length) { video.currentTime = 0; return; }
        const target = Math.max(0, video.duration * fractions[i]);
        video.currentTime = target;
      }
      function onSeeked() {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const tile = document.createElement('div');
          tile.className = 'yts-thumb yts-thumb-frame';
          tile.innerHTML = `<img src="${dataUrl}" alt="Suggested thumbnail">`;
          tile.addEventListener('click', () => selectThumbnail(dataUrl, tile));
          thumbGrid.insertBefore(tile, thumbUploadTile);
          if (i === 0) selectThumbnail(dataUrl, tile); // default to the first frame
        } catch (err) { /* canvas may be tainted on some browsers — skip silently */ }
        i++;
        captureNext();
      }
      video.addEventListener('seeked', onSeeked);
      captureNext();
      video.addEventListener('loadeddata', () => { video.muted = wasMuted; }, { once: true });
    }

    function selectThumbnail(dataUrl, tileEl) {
      selectedThumbnail = dataUrl;
      thumbGrid.querySelectorAll('.yts-thumb').forEach((t) => t.classList.remove('selected'));
      tileEl?.classList.add('selected');
    }

    thumbUploadTile?.addEventListener('click', () => thumbFileInput.click());
    thumbFileInput?.addEventListener('change', () => {
      const file = thumbFileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        // Compress/resize the uploaded image the same way as the auto frames.
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 320; canvas.height = 180;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          selectThumbnail(dataUrl, thumbUploadTile);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });

    titleInput?.addEventListener('input', () => {
      titleCount.textContent = `${titleInput.value.length}/100`;
    });

    // ---- Step navigation ----
    function showStep(step) {
      currentStep = step;
      stepsWrap.querySelectorAll('.yts-step').forEach((btn) => btn.classList.toggle('active', btn.dataset.step === step));
      panes.forEach((pane) => pane.classList.toggle('d-none', pane.dataset.pane !== step));
      backBtn.classList.toggle('d-none', step === 'details');
      nextBtn.classList.toggle('d-none', step !== 'details');
      publishBtn.classList.toggle('d-none', step !== 'visibility');
    }
    stepsWrap.querySelectorAll('.yts-step').forEach((btn) => {
      btn.addEventListener('click', () => showStep(btn.dataset.step));
    });
    nextBtn.addEventListener('click', () => {
      if (!titleInput.value.trim()) { titleInput.focus(); return; }
      showStep('visibility');
    });
    backBtn.addEventListener('click', () => showStep('details'));

    // ---- Publish ----
    publishBtn.addEventListener('click', () => {
      if (!currentFile) return;
      const placements = Array.from(document.querySelectorAll('input[name="yts-placement"]:checked')).map((c) => c.value);
      if (!placements.length) { alert('Pick at least one place for this video to show.'); return; }

      const formData = new FormData();
      formData.append('title', titleInput.value.trim());
      formData.append('subject', subjectInput.value.trim());
      formData.append('description', descInput.value.trim());
      formData.append('file', currentFile);
      if (selectedThumbnail) formData.append('thumbnail_url', selectedThumbnail);
      placements.forEach((p) => formData.append('placements', p));

      publishBtn.disabled = true;
      backBtn.disabled = true;
      closeBtn.disabled = true;
      modalBody.style.display = 'none';
      modalFooter.style.display = 'none';
      stepsWrap.style.display = 'none';
      modalStatus.textContent = 'Uploading… 0%';
      footerStatus.textContent = '';

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/videos');
      xhr.withCredentials = true;
      xhr.upload.addEventListener('progress', (e) => {
        if (!e.lengthComputable) return;
        const pct = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = pct + '%';
        modalStatus.textContent = pct < 100 ? `Uploading… ${pct}%` : 'Processing…';
      });
      xhr.addEventListener('load', () => {
        publishBtn.disabled = false;
        backBtn.disabled = false;
        closeBtn.disabled = false;
        if (xhr.status >= 200 && xhr.status < 300) {
          progressBar.style.width = '100%';
          modalStatus.textContent = 'Done';
          showDone();
          window.dispatchEvent(new CustomEvent('s21:video-published'));
        } else {
          let message = 'Upload failed.';
          try { message = JSON.parse(xhr.responseText).error || message; } catch (e) { /* ignore */ }
          modalStatus.textContent = 'Upload failed';
          footerStatus.textContent = message;
          footerStatus.style.color = 'var(--s21-accent)';
          modalBody.style.display = '';
          modalFooter.style.display = '';
          stepsWrap.style.display = '';
        }
      });
      xhr.addEventListener('error', () => {
        publishBtn.disabled = false;
        backBtn.disabled = false;
        closeBtn.disabled = false;
        modalStatus.textContent = 'Upload failed';
        footerStatus.textContent = 'Network error — please try again.';
        footerStatus.style.color = 'var(--s21-accent)';
        modalBody.style.display = '';
        modalFooter.style.display = '';
        stepsWrap.style.display = '';
      });
      xhr.send(formData);
    });

    function showDone() {
      modalBody.classList.add('d-none');
      doneWrap.classList.remove('d-none');
    }

    function resetModalUI() {
      progressBar.style.width = '0%';
      publishBtn.disabled = false;
      backBtn.disabled = false;
      closeBtn.disabled = false;
      modalBody.style.display = '';
      modalFooter.style.display = '';
      stepsWrap.style.display = '';
      modalBody.classList.remove('d-none');
      doneWrap.classList.add('d-none');
      footerStatus.textContent = '';
      thumbGrid.querySelectorAll('.yts-thumb-frame').forEach((el) => el.remove());
      showStep('details');
    }

    function closeModal() {
      overlay.classList.add('d-none');
      if (previewVideo.src) { URL.revokeObjectURL(previewVideo.src); previewVideo.removeAttribute('src'); previewVideo.load(); }
      fileInput.value = '';
      thumbFileInput.value = '';
      currentFile = null;
      selectedThumbnail = '';
    }
    closeBtn.addEventListener('click', () => {
      if (currentFile && !doneWrap.classList.contains('d-none')) { closeModal(); return; }
      if (currentFile && confirm('Discard this upload?')) closeModal();
      else if (!currentFile) closeModal();
    });
    doneCloseBtn.addEventListener('click', closeModal);
  });
})();
