/* ============================================================
   Featured Courses — Three.js interactive symbols background
   A field of drifting science & maths glyphs (π, ∑, √, ∞, atoms,
   DNA, molecules...) rendered on a green backdrop that gently
   reacts to the mouse / touch cursor.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var host = document.getElementById("symbolsCanvas");
    var section = host && host.closest(".section-symbols");
    if (!host || !section || typeof THREE === "undefined") return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isSmall = window.innerWidth < 768;

    // ---------- Renderer / scene / camera ----------
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 22;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      return; // WebGL unavailable — fail silently, CSS gradient still looks fine
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    // ---------- Resize (set up + run BEFORE placing sprites, so camera.aspect
    // is correct and glyphs spread across the section's full width, not just
    // the center) ----------
    function resize() {
      var w = host.clientWidth || section.clientWidth;
      var h = host.clientHeight || section.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    }
    resize();
    window.addEventListener("resize", resize);

    // ---------- Palette (matches brand vars) ----------
    var palette = [
      { fill: "#FFFFFF", glow: "rgba(255,255,255,0.9)" },
      { fill: "#FFD166", glow: "rgba(255,209,102,0.95)" }, // secondary gold
      { fill: "#FDECF1", glow: "rgba(239,71,111,0.85)" },  // accent pink glow
      { fill: "#CFF3E1", glow: "rgba(207,243,225,0.9)" }   // soft mint
    ];

    // ---------- Texture generators ----------
    function makeTextTexture(str, colorSet, fontSize) {
      var size = 256;
      var cvs = document.createElement("canvas");
      cvs.width = cvs.height = size;
      var ctx = cvs.getContext("2d");
      ctx.clearRect(0, 0, size, size);
      ctx.font = "700 " + fontSize + "px 'Segoe UI', system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = colorSet.glow;
      ctx.shadowBlur = 34;
      ctx.fillStyle = colorSet.fill;
      ctx.fillText(str, size / 2, size / 2 + fontSize * 0.06);
      ctx.shadowBlur = 8;
      ctx.fillText(str, size / 2, size / 2 + fontSize * 0.06);
      var tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      return tex;
    }

    function makeAtomTexture(colorSet) {
      var size = 256;
      var cvs = document.createElement("canvas");
      cvs.width = cvs.height = size;
      var ctx = cvs.getContext("2d");
      ctx.translate(size / 2, size / 2);
      ctx.strokeStyle = colorSet.fill;
      ctx.lineWidth = 6;
      ctx.shadowColor = colorSet.glow;
      ctx.shadowBlur = 22;
      for (var i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 3) * i);
        ctx.beginPath();
        ctx.ellipse(0, 0, 92, 34, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = colorSet.fill;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      var tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      return tex;
    }

    function makeDnaTexture(colorSet) {
      var size = 256;
      var cvs = document.createElement("canvas");
      cvs.width = cvs.height = size;
      var ctx = cvs.getContext("2d");
      ctx.strokeStyle = colorSet.fill;
      ctx.fillStyle = colorSet.fill;
      ctx.lineWidth = 5;
      ctx.shadowColor = colorSet.glow;
      ctx.shadowBlur = 16;
      var amp = 46, mid = size / 2, top = 14, bottom = size - 14;
      ctx.beginPath();
      for (var y = top; y <= bottom; y += 4) {
        var x = mid + Math.sin(((y - top) / (bottom - top)) * Math.PI * 3) * amp;
        if (y === top) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.beginPath();
      for (var y2 = top; y2 <= bottom; y2 += 4) {
        var x2 = mid + Math.sin(((y2 - top) / (bottom - top)) * Math.PI * 3 + Math.PI) * amp;
        if (y2 === top) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.globalAlpha = 0.75;
      for (var y3 = top + 6; y3 <= bottom - 6; y3 += 22) {
        var xa = mid + Math.sin(((y3 - top) / (bottom - top)) * Math.PI * 3) * amp;
        var xb = mid + Math.sin(((y3 - top) / (bottom - top)) * Math.PI * 3 + Math.PI) * amp;
        ctx.beginPath();
        ctx.moveTo(xa, y3);
        ctx.lineTo(xb, y3);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      return tex;
    }

    function makeMoleculeTexture(colorSet) {
      var size = 256;
      var cvs = document.createElement("canvas");
      cvs.width = cvs.height = size;
      var ctx = cvs.getContext("2d");
      ctx.translate(size / 2, size / 2);
      ctx.strokeStyle = colorSet.fill;
      ctx.fillStyle = colorSet.fill;
      ctx.lineWidth = 5;
      ctx.shadowColor = colorSet.glow;
      ctx.shadowBlur = 18;
      var pts = [[0, -60], [-58, 30], [58, 30]];
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.moveTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.stroke();
      for (var i = 0; i < pts.length; i++) {
        ctx.beginPath();
        ctx.arc(pts[i][0], pts[i][1], i === 0 ? 18 : 14, 0, Math.PI * 2);
        ctx.fill();
      }
      var tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      return tex;
    }

    // ---------- Build the glyph pool ----------
    var glyphs = ["π", "∑", "√", "∞", "∫", "Δ", "θ", "λ", "±", "÷", "×", "α", "β", "E=mc²"];
    var textures = [];
    glyphs.forEach(function (g) {
      var colorSet = palette[Math.floor(Math.random() * palette.length)];
      var fontSize = g.length > 2 ? 70 : 150;
      textures.push({ tex: makeTextTexture(g, colorSet, fontSize), kind: "text" });
    });
    [makeAtomTexture, makeDnaTexture, makeMoleculeTexture].forEach(function (fn) {
      palette.forEach(function (c) {
        textures.push({ tex: fn(c), kind: "icon" });
      });
    });

    // ---------- Sprites ----------
    var group = new THREE.Group();
    scene.add(group);
    var sprites = [];
    var count = isSmall ? 18 : reduceMotion ? 16 : 32;

    function visibleSizeAtZ(depth) {
      var vFov = (camera.fov * Math.PI) / 180;
      var height = 2 * Math.tan(vFov / 2) * Math.abs(camera.position.z - depth);
      var width = height * camera.aspect;
      return { width: width, height: height };
    }

    // Grid-jittered placement: split the section into a loose grid and drop
    // one glyph per cell (with randomness) so they spread evenly across the
    // whole width/height instead of clumping near the center.
    var cols = isSmall ? 5 : 7;
    var rows = Math.max(3, Math.ceil(count / cols));
    var cellIndex = 0;
    var cellOrder = [];
    for (var c = 0; c < cols * rows; c++) cellOrder.push(c);
    // shuffle so the reading order doesn't look like a rigid grid
    for (var sIdx = cellOrder.length - 1; sIdx > 0; sIdx--) {
      var rIdx = Math.floor(Math.random() * (sIdx + 1));
      var tmp = cellOrder[sIdx]; cellOrder[sIdx] = cellOrder[rIdx]; cellOrder[rIdx] = tmp;
    }

    for (var i = 0; i < count; i++) {
      var pick = textures[Math.floor(Math.random() * textures.length)];
      var mat = new THREE.SpriteMaterial({
        map: pick.tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.5 + Math.random() * 0.35
      });
      var sprite = new THREE.Sprite(mat);
      var z = -6 + Math.random() * 9; // -6 .. 3
      var bounds = visibleSizeAtZ(z);
      var usableW = bounds.width * 0.94;
      var usableH = bounds.height * 0.9;

      var cell = cellOrder[cellIndex % cellOrder.length];
      cellIndex++;
      var col = cell % cols;
      var row = Math.floor(cell / cols);
      var cellW = usableW / cols;
      var cellH = usableH / rows;
      var jitterX = (Math.random() - 0.5) * cellW * 0.85;
      var jitterY = (Math.random() - 0.5) * cellH * 0.85;
      var baseX = -usableW / 2 + cellW * (col + 0.5) + jitterX;
      var baseY = -usableH / 2 + cellH * (row + 0.5) + jitterY;

      sprite.position.set(baseX, baseY, z);
      var scale = pick.kind === "icon" ? 2.1 + Math.random() * 1.1 : 1.5 + Math.random() * 1.3;
      sprite.scale.set(scale, scale, 1);
      group.add(sprite);
      sprites.push({
        sprite: sprite,
        base: new THREE.Vector3(baseX, baseY, z),
        offset: new THREE.Vector2(0, 0),
        vel: new THREE.Vector2(0, 0),
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.35,
        floatAmp: 0.5 + Math.random() * 0.7,
        rotSpeed: (Math.random() - 0.5) * 0.15
      });
    }

    // ---------- Ambient particle dust ----------
    var dustCount = isSmall ? 60 : reduceMotion ? 50 : 140;
    var dustGeo = new THREE.BufferGeometry();
    var dustPos = new Float32Array(dustCount * 3);
    for (var d = 0; d < dustCount; d++) {
      var dz = -8 + Math.random() * 12;
      var b = visibleSizeAtZ(dz);
      dustPos[d * 3] = (Math.random() * 2 - 1) * b.width * 0.5;
      dustPos[d * 3 + 1] = (Math.random() * 2 - 1) * b.height * 0.5;
      dustPos[d * 3 + 2] = dz;
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
    var dustMat = new THREE.PointsMaterial({
      color: 0xffe9a8,
      size: 0.09,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ---------- Mouse tracking (raycast onto z=0 plane) ----------
    var raycaster = new THREE.Raycaster();
    var ndc = new THREE.Vector2(9999, 9999);
    var mouseWorld = new THREE.Vector3(9999, 9999, 0);
    var groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    var pointerActive = false;

    function updatePointerFromEvent(clientX, clientY) {
      var rect = section.getBoundingClientRect();
      if (
        clientX < rect.left || clientX > rect.right ||
        clientY < rect.top || clientY > rect.bottom
      ) {
        pointerActive = false;
        return;
      }
      pointerActive = true;
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    }

    window.addEventListener("mousemove", function (e) {
      updatePointerFromEvent(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener("touchmove", function (e) {
      if (e.touches && e.touches[0]) {
        updatePointerFromEvent(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener("touchend", function () { pointerActive = false; }, { passive: true });
    window.addEventListener("mouseleave", function () { pointerActive = false; }, { passive: true });

    // ---------- Pause when off-screen (perf) ----------
    var isVisible = true;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        isVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      io.observe(section);
    }

    // ---------- Animation loop ----------
    var clock = new THREE.Clock();
    var gravityRadius = 9.5;   // wide field: glyphs get pulled toward the cursor
    var gravityStrength = 1.9; // how strongly they're pulled in + swirl around it
    var coreRadius = 2.4;      // very close to the cursor they push back out
    var repelStrength = 3.4;

    function animate() {
      requestAnimationFrame(animate);
      if (!isVisible) return;

      var t = clock.getElapsedTime();

      if (pointerActive) {
        raycaster.setFromCamera(ndc, camera);
        var hit = new THREE.Vector3();
        raycaster.ray.intersectPlane(groundPlane, hit);
        if (hit) mouseWorld.copy(hit);
      }

      for (var i = 0; i < sprites.length; i++) {
        var s = sprites[i];
        var float = Math.sin(t * s.speed + s.phase) * s.floatAmp;
        var floatX = Math.cos(t * s.speed * 0.7 + s.phase) * s.floatAmp * 0.5;

        if (pointerActive && !reduceMotion) {
          var px = s.base.x + s.offset.x;
          var py = s.base.y + float * 0.3 + s.offset.y;
          var dx = mouseWorld.x - px; // vector FROM glyph TO cursor
          var dy = mouseWorld.y - py;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

          if (dist < gravityRadius) {
            var pull = (1 - dist / gravityRadius) * gravityStrength;
            // gentle pull toward the cursor, like a gravity field
            s.vel.x += (dx / dist) * pull * 0.05;
            s.vel.y += (dy / dist) * pull * 0.05;
            // small tangential swirl so glyphs orbit rather than fly straight in
            s.vel.x += (-dy / dist) * pull * 0.03;
            s.vel.y += (dx / dist) * pull * 0.03;
          }
          if (dist < coreRadius) {
            // too close: push back out so glyphs don't pile up on the cursor
            var push = (1 - dist / coreRadius) * repelStrength;
            s.vel.x += (-dx / dist) * push * 0.09;
            s.vel.y += (-dy / dist) * push * 0.09;
          }
        }
        // spring back to rest + damping
        s.vel.x += -s.offset.x * 0.016;
        s.vel.y += -s.offset.y * 0.016;
        s.vel.x *= 0.91;
        s.vel.y *= 0.91;
        s.offset.x += s.vel.x;
        s.offset.y += s.vel.y;

        s.sprite.position.x = s.base.x + s.offset.x + floatX;
        s.sprite.position.y = s.base.y + s.offset.y + float;
        s.sprite.material.rotation += s.rotSpeed * 0.01;
      }

      dust.rotation.y = t * 0.015;
      dust.rotation.x = Math.sin(t * 0.05) * 0.05;

      renderer.render(scene, camera);
    }

    if (reduceMotion) {
      // Render a single static-ish frame set, skip continuous RAF-heavy interaction
      resize();
      renderer.render(scene, camera);
      window.addEventListener("resize", function () { renderer.render(scene, camera); });
    } else {
      animate();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
