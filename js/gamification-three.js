/* ============================================================
   Smart21Brain Gamification — Three.js interactive game-icon
   background. A field of soft, single-colour, line-icon style
   glyphs (gamepad / ball / joystick / dice / trophy / star)
   drifts behind the content and gently reacts to the mouse /
   touch cursor. Every glyph shares one accent colour and the
   same clean, rounded stroke style, so the set reads as a
   coherent icon set rather than mismatched emoji.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var host = document.getElementById("gamificationCanvas");
    var section = host && host.closest(".section-gamification");
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
      return; // WebGL unavailable — the section's own background still looks fine on its own
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // fully transparent: section keeps its own bg colour
    host.appendChild(renderer.domElement);

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

    // ---------- Single accent colour for every glyph ----------
    var ICON_COLOR = "#EAF4FF";        // soft near-white, cool glow on the dark blue bg
    var GLOW_COLOR = "rgba(120,178,255,0.85)";

    // ---------- Icon canvas builder: transparent bg, one flat colour,
    // consistent rounded stroke weight and a soft glow — no cutouts,
    // no gradients, so every glyph shares the exact same visual build. ----------
    var STROKE = 12; // consistent line weight, in a 256px canvas, across all glyphs

    function iconTexture(drawGlyph) {
      var size = 256;
      var cvs = document.createElement("canvas");
      cvs.width = cvs.height = size;
      var ctx = cvs.getContext("2d");
      ctx.translate(size / 2, size / 2);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = ICON_COLOR;
      ctx.fillStyle = ICON_COLOR;
      ctx.lineWidth = STROKE;
      ctx.shadowColor = GLOW_COLOR;
      ctx.shadowBlur = 20;
      drawGlyph(ctx, size * 0.5);
      // a second, tighter pass keeps edges crisp under the soft glow
      ctx.shadowBlur = 6;
      drawGlyph(ctx, size * 0.5);
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      var tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      tex.anisotropy = 4;
      return tex;
    }

    // ---------- Game glyphs (drawn centred at 0,0; r = half the canvas) ----------
    // All glyphs use only stroked outlines + a few small filled dots, at the
    // same STROKE weight, so the whole set reads as one consistent icon family.

    function drawGamepad(ctx, r) {
      var w = r * 0.82, h = r * 0.46;
      ctx.beginPath();
      ctx.moveTo(-w * 0.55, -h * 0.35);
      ctx.bezierCurveTo(-w * 0.75, -h, -w * 0.15, -h * 0.9, 0, -h * 0.55);
      ctx.bezierCurveTo(w * 0.15, -h * 0.9, w * 0.75, -h, w * 0.55, -h * 0.35);
      ctx.bezierCurveTo(w * 0.85, h * 0.15, w * 0.55, h * 1.05, w * 0.2, h * 0.55);
      ctx.bezierCurveTo(w * 0.08, h * 0.3, -w * 0.08, h * 0.3, -w * 0.2, h * 0.55);
      ctx.bezierCurveTo(-w * 0.55, h * 1.05, -w * 0.85, h * 0.15, -w * 0.55, -h * 0.35);
      ctx.closePath();
      ctx.stroke();
      // D-pad
      ctx.beginPath();
      ctx.moveTo(-w * 0.42, -h * 0.1); ctx.lineTo(-w * 0.22, -h * 0.1);
      ctx.moveTo(-w * 0.32, -h * 0.2); ctx.lineTo(-w * 0.32, 0);
      ctx.stroke();
      // face buttons
      var bx = w * 0.36, by = -h * 0.05, br = r * 0.06;
      [[0, -1], [1, 0], [-1, 0], [0, 1]].forEach(function (p) {
        ctx.beginPath();
        ctx.arc(bx + p[0] * br * 1.8, by + p[1] * br * 1.8, br * 0.55, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawBall(ctx, r) {
      var rad = r * 0.55;
      ctx.beginPath();
      ctx.arc(0, 0, rad, 0, Math.PI * 2);
      ctx.stroke();
      // three soft seam curves, same stroke weight, thinner for hierarchy
      ctx.save();
      ctx.lineWidth = STROKE * 0.55;
      for (var i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 3);
        ctx.beginPath();
        ctx.ellipse(0, 0, rad * 0.98, rad * 0.36, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    function drawJoystick(ctx, r) {
      ctx.beginPath();
      ctx.ellipse(0, r * 0.42, r * 0.4, r * 0.14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, r * 0.32);
      ctx.lineTo(0, -r * 0.18);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -r * 0.32, r * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawDice(ctx, r) {
      var half = r * 0.44;
      roundRect(ctx, -half, -half, half * 2, half * 2, half * 0.32);
      ctx.stroke();
      var pip = r * 0.07;
      var pts = [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]];
      pts.forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p[0] * half * 0.5, p[1] * half * 0.5, pip, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function roundRect(ctx, x, y, w, h, rad) {
      ctx.beginPath();
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + w, y, x + w, y + h, rad);
      ctx.arcTo(x + w, y + h, x, y + h, rad);
      ctx.arcTo(x, y + h, x, y, rad);
      ctx.arcTo(x, y, x + w, y, rad);
      ctx.closePath();
    }

    function drawTrophy(ctx, r) {
      var w = r * 0.5, h = r * 0.6;
      ctx.beginPath();
      ctx.moveTo(-w, -h);
      ctx.lineTo(w, -h);
      ctx.bezierCurveTo(w * 1.05, -h * 0.15, w * 0.55, h * 0.35, 0, h * 0.4);
      ctx.bezierCurveTo(-w * 0.55, h * 0.35, -w * 1.05, -h * 0.15, -w, -h);
      ctx.closePath();
      ctx.stroke();
      // handles
      ctx.beginPath(); ctx.arc(-w * 1.3, -h * 0.55, w * 0.42, Math.PI * 0.15, Math.PI * 1.55); ctx.stroke();
      ctx.beginPath(); ctx.arc(w * 1.3, -h * 0.55, w * 0.42, Math.PI * 1.45, Math.PI * 2.85); ctx.stroke();
      // stem + base
      ctx.beginPath();
      ctx.moveTo(0, h * 0.4); ctx.lineTo(0, h * 0.72);
      ctx.stroke();
      roundRect(ctx, -w * 0.75, h * 0.72, w * 1.5, h * 0.22, r * 0.05);
      ctx.stroke();
    }

    function drawStar(ctx, r) {
      var spikes = 5, outer = r * 0.55, inner = outer * 0.44;
      var rot = -Math.PI / 2;
      ctx.beginPath();
      for (var i = 0; i < spikes; i++) {
        var xo = Math.cos(rot) * outer, yo = Math.sin(rot) * outer;
        ctx.lineTo(xo, yo);
        rot += Math.PI / spikes;
        var xi = Math.cos(rot) * inner, yi = Math.sin(rot) * inner;
        ctx.lineTo(xi, yi);
        rot += Math.PI / spikes;
      }
      ctx.closePath();
      ctx.stroke();
    }

    var glyphSet = [drawGamepad, drawBall, drawJoystick, drawDice, drawTrophy, drawStar];

    // ---------- Build the (single-colour) texture pool — one texture per glyph ----------
    var textures = glyphSet.map(function (fn) { return iconTexture(fn); });

    // ---------- Sprites ----------
    var group = new THREE.Group();
    scene.add(group);
    var sprites = [];
    var count = isSmall ? 12 : reduceMotion ? 12 : 18;

    function visibleSizeAtZ(depth) {
      var vFov = (camera.fov * Math.PI) / 180;
      var height = 2 * Math.tan(vFov / 2) * Math.abs(camera.position.z - depth);
      var width = height * camera.aspect;
      return { width: width, height: height };
    }

    // Grid-jittered placement so glyphs spread across the whole section
    // instead of clumping behind the image or the text column.
    var cols = isSmall ? 4 : 6;
    var rows = Math.max(3, Math.ceil(count / cols));
    var cellOrder = [];
    for (var c = 0; c < cols * rows; c++) cellOrder.push(c);
    for (var sIdx = cellOrder.length - 1; sIdx > 0; sIdx--) {
      var rIdx = Math.floor(Math.random() * (sIdx + 1));
      var tmp = cellOrder[sIdx]; cellOrder[sIdx] = cellOrder[rIdx]; cellOrder[rIdx] = tmp;
    }
    var cellIndex = 0;

    for (var i = 0; i < count; i++) {
      var tex = textures[Math.floor(Math.random() * textures.length)];
      var mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending, // soft glow, suits the dark blue background
        opacity: 0.4 + Math.random() * 0.3
      });
      var sprite = new THREE.Sprite(mat);
      var z = -5 + Math.random() * 7; // -5 .. 2
      var bounds = visibleSizeAtZ(z);
      var usableW = bounds.width * 0.96;
      var usableH = bounds.height * 0.92;

      var cell = cellOrder[cellIndex % cellOrder.length];
      cellIndex++;
      var col = cell % cols;
      var row = Math.floor(cell / cols);
      var cellW = usableW / cols;
      var cellH = usableH / rows;
      var jitterX = (Math.random() - 0.5) * cellW * 0.8;
      var jitterY = (Math.random() - 0.5) * cellH * 0.8;
      var baseX = -usableW / 2 + cellW * (col + 0.5) + jitterX;
      var baseY = -usableH / 2 + cellH * (row + 0.5) + jitterY;

      sprite.position.set(baseX, baseY, z);
      var scale = 1.7 + Math.random() * 1.3;
      sprite.scale.set(scale, scale, 1);
      group.add(sprite);
      sprites.push({
        sprite: sprite,
        base: new THREE.Vector3(baseX, baseY, z),
        offset: new THREE.Vector2(0, 0),
        vel: new THREE.Vector2(0, 0),
        phase: Math.random() * Math.PI * 2,
        speed: 0.22 + Math.random() * 0.3,
        floatAmp: 0.35 + Math.random() * 0.5,
        rotSpeed: (Math.random() - 0.5) * 0.12
      });
    }

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
    var gravityRadius = 8.5;
    var gravityStrength = 1.6;
    var coreRadius = 2.2;
    var repelStrength = 3.0;

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

      for (var i2 = 0; i2 < sprites.length; i2++) {
        var s = sprites[i2];
        var float = Math.sin(t * s.speed + s.phase) * s.floatAmp;
        var floatX = Math.cos(t * s.speed * 0.7 + s.phase) * s.floatAmp * 0.5;

        if (pointerActive && !reduceMotion) {
          var px = s.base.x + s.offset.x;
          var py = s.base.y + float * 0.3 + s.offset.y;
          var dx = mouseWorld.x - px;
          var dy = mouseWorld.y - py;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

          if (dist < gravityRadius) {
            var pull = (1 - dist / gravityRadius) * gravityStrength;
            s.vel.x += (dx / dist) * pull * 0.05;
            s.vel.y += (dy / dist) * pull * 0.05;
            s.vel.x += (-dy / dist) * pull * 0.025;
            s.vel.y += (dx / dist) * pull * 0.025;
          }
          if (dist < coreRadius) {
            var push = (1 - dist / coreRadius) * repelStrength;
            s.vel.x += (-dx / dist) * push * 0.09;
            s.vel.y += (-dy / dist) * push * 0.09;
          }
        }
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

      renderer.render(scene, camera);
    }

    if (reduceMotion) {
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
