/* Smart21Brain — video.js
   A custom control layer over a native <video> element: play/pause, seek,
   volume, playback speed, captions toggle, quality menu (visual — wire to
   real multi-bitrate sources later), picture-in-picture, fullscreen,
   theater mode, and clickable chapters. */
(function () {
  function $(id) { return document.getElementById(id); }
  function fmtTime(sec) {
    if (!isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const shell = $('player-shell');
    const video = $('player-video');
    if (!shell || !video) return; // not on the video page

    const playBtn = $('player-play-big');
    const toggleBtn = $('player-toggle');
    const seek = $('player-seek');
    const timeEl = $('player-time');
    const volume = $('player-volume');
    const muteBtn = $('player-mute');
    const speedMenu = $('player-speed-menu');
    const speedBtn = $('player-speed-btn');
    const captionsBtn = $('player-captions');
    const pipBtn = $('player-pip');
    const fullscreenBtn = $('player-fullscreen');
    const theaterBtn = $('player-theater');

    function togglePlay() {
      if (video.paused) video.play(); else video.pause();
    }
    function onPlay() { shell.classList.add('is-playing'); toggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i>'; }
    function onPause() { shell.classList.remove('is-playing'); toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i>'; }

    playBtn.addEventListener('click', togglePlay);
    toggleBtn.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    video.addEventListener('loadedmetadata', () => {
      seek.max = video.duration || 0;
      timeEl.textContent = `0:00 / ${fmtTime(video.duration)}`;
    });
    video.addEventListener('timeupdate', () => {
      if (!seek.matches(':active')) seek.value = video.currentTime;
      timeEl.textContent = `${fmtTime(video.currentTime)} / ${fmtTime(video.duration)}`;
      updateChapterHighlight();
    });
    seek.addEventListener('input', () => { video.currentTime = parseFloat(seek.value); });

    volume.addEventListener('input', () => {
      video.volume = parseFloat(volume.value);
      video.muted = video.volume === 0;
      muteBtn.innerHTML = video.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    });
    muteBtn.addEventListener('click', () => {
      video.muted = !video.muted;
      muteBtn.innerHTML = video.muted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    });

    // Playback speed menu
    speedBtn?.addEventListener('click', (e) => { e.stopPropagation(); speedMenu.classList.toggle('open'); });
    speedMenu?.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        video.playbackRate = parseFloat(btn.dataset.speed);
        speedMenu.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        speedBtn.textContent = btn.dataset.speed + 'x';
        speedMenu.classList.remove('open');
      });
    });
    document.addEventListener('click', () => speedMenu?.classList.remove('open'));

    // Captions toggle (uses the <track> if present)
    captionsBtn?.addEventListener('click', () => {
      const track = video.textTracks[0];
      if (!track) return;
      const on = track.mode === 'showing';
      track.mode = on ? 'hidden' : 'showing';
      captionsBtn.classList.toggle('is-active', !on);
    });

    // Picture-in-picture
    pipBtn?.addEventListener('click', async () => {
      try {
        if (document.pictureInPictureElement) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
      } catch (err) { /* PiP unsupported — silently ignore */ }
    });

    // Fullscreen
    fullscreenBtn?.addEventListener('click', () => {
      if (!document.fullscreenElement) shell.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    // Theater mode
    theaterBtn?.addEventListener('click', () => {
      shell.classList.toggle('theater');
      theaterBtn.classList.toggle('is-active');
    });

    // Auto-hide controls while playing and idle
    let hideTimer;
    shell.addEventListener('mousemove', () => {
      shell.classList.remove('controls-hidden');
      clearTimeout(hideTimer);
      if (!video.paused) hideTimer = setTimeout(() => shell.classList.add('controls-hidden'), 2500);
    });
    shell.addEventListener('mouseleave', () => { if (!video.paused) shell.classList.add('controls-hidden'); });

    // Chapters
    function updateChapterHighlight() {
      document.querySelectorAll('.chapter-marker').forEach((el) => {
        const start = parseFloat(el.dataset.start);
        const end = parseFloat(el.dataset.end);
        el.classList.toggle('active', video.currentTime >= start && video.currentTime < end);
      });
    }
    document.querySelectorAll('.chapter-marker').forEach((el) => {
      el.addEventListener('click', () => {
        video.currentTime = parseFloat(el.dataset.start);
        video.play();
      });
    });

    // Keyboard shortcuts while the player has focus
    shell.setAttribute('tabindex', '0');
    shell.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      if (e.key === 'ArrowRight') video.currentTime += 5;
      if (e.key === 'ArrowLeft') video.currentTime -= 5;
      if (e.key === 'f') fullscreenBtn?.click();
      if (e.key === 'm') muteBtn?.click();
    });

    // Autoplay-next toggle + related video click just navigates (real app would swap src)
    $('player-autoplay-toggle')?.addEventListener('change', function () {
      localStorage.setItem('s21-autoplay-next', this.checked ? '1' : '0');
    });
    const autoplayToggle = $('player-autoplay-toggle');
    if (autoplayToggle) autoplayToggle.checked = localStorage.getItem('s21-autoplay-next') !== '0';

    // ---- Real watch-progress sync (resume + save) for signed-in viewers ----
    // Works for both the demo video and a real ?id=... video — the id in
    // the URL is all that's needed; loadRequestedVideo() (inline script,
    // below) independently swaps in the real source for admin-posted videos.
    const videoId = new URLSearchParams(location.search).get('id');
    if (videoId && window.S21_getVideoProgress) {
      window.S21_getVideoProgress(videoId).then((progress) => {
        if (!progress || progress.completed || progress.position_seconds <= 5) return;
        const resume = () => {
          if (video.duration && progress.position_seconds < video.duration - 5) {
            video.currentTime = progress.position_seconds;
          }
        };
        if (video.readyState >= 1) resume();
        video.addEventListener('loadedmetadata', resume); // also fires again if the source is swapped in later
      });

      let lastSavedAt = 0;
      video.addEventListener('timeupdate', () => {
        if (video.currentTime - lastSavedAt < 5) return; // throttle to ~every 5s of playback
        lastSavedAt = video.currentTime;
        window.S21_saveVideoProgress?.(videoId, video.currentTime);
      });
      video.addEventListener('pause', () => window.S21_saveVideoProgress?.(videoId, video.currentTime));
      video.addEventListener('ended', () => window.S21_saveVideoProgress?.(videoId, video.duration || video.currentTime));
    }
  });
})();
