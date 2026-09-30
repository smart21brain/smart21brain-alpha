/* ============================================================
   Smart21Brain VideoHub — Three.js interactive maths-formula
   background. A field of drifting maths symbols and short
   formulas (π, ∑, √, ∫, a²+b²=c², E=mc² ...) plus a couple of
   simple line-drawn formula graphics (a graph curve, a fraction
   bar, an angle) that gently react to the mouse / touch cursor.
   Everything renders in one flat colour — the site's official
   "Mathematics" subject colour — and the section keeps its own
   existing background colour untouched (fully transparent
   renderer).
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var host = document.getElementById("videohubFormulaCanvas");
    var section = host && host.closest(".section-videohub-formula");
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

    // ---------- Single accent colour — the site's "Mathematics" subject colour ----------
    var cssVal = getComputedStyle(document.documentElement).getPropertyValue("--subj-math");
    var MATH_COLOR = (cssVal && cssVal.trim()) || "#3A86FF";
    var GLOW_COLOR = "rgba(58,134,255,0.45)";

    // ---------- Text-glyph texture builder ----------
    function makeTextTexture(str, fontSize) {
      var size = 256;
      var cvs = document.createElement("canvas");
      cvs.width = cvs.height = size;
      var ctx = cvs.getContext("2d");
      ctx.font = "700 " + fontSize + "px 'Segoe UI', system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = GLOW_COLOR;
      ctx.shadowBlur = 16;
      ctx.fillStyle = MATH_COLOR;
      ctx.fillText(str, size / 2, size / 2 + fontSize * 0.06);
      ctx.shadowBlur = 4;
      ctx.fillText(str, size / 2, size / 2 + fontSize * 0.06);
      var tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      return tex;
    }

    // ---------- Small line-drawn formula graphics (same colour, same stroke weight) ----------
    var STROKE = 7;

    function iconCanvas(drawFn) {
      var size = 256;
      var cvs = document.createElement("canvas");
      cvs.width = cvs.height = size;
      var ctx = cvs.getContext("2d");
      ctx.translate(size / 2, size / 2);
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = MATH_COLOR;
      ctx.fillStyle = MATH_COLOR;
      ctx.lineWidth = STROKE;
      ctx.shadowColor = GLOW_COLOR;
      ctx.shadowBlur = 14;
      drawFn(ctx, size * 0.5);
      ctx.shadowBlur = 4;
      drawFn(ctx, size * 0.5);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      var tex = new THREE.CanvasTexture(cvs);
      tex.needsUpdate = true;
      return tex;
    }

    function drawGraphCurve(ctx, r) {
      // axes
      ctx.beginPath();
      ctx.moveTo(-r * 0.65, r * 0.55); ctx.lineTo(r * 0.65, r * 0.55);
      ctx.moveTo(-r * 0.55, r * 0.65); ctx.lineTo(-r * 0.55, -r * 0.55);
      ctx.stroke();
      // parabola-ish curve
      ctx.beginPath();
      for (var x = -r * 0.5; x <= r * 0.55; x += r * 0.05) {
        var xn = x / (r * 0.55);
        var y = -(1 - xn * xn) * r * 0.5 + r * 0.15;
        if (x === -r * 0.5) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    function drawFractionBar(ctx, r) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.45, 0); ctx.lineTo(r * 0.45, 0);
      ctx.stroke();
      ctx.font = "700 " + (r * 0.62) + "px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("a", 0, -r * 0.14);
      ctx.textBaseline = "hanging";
      ctx.fillText("b", 0, r * 0.14);
    }

    function drawAngle(ctx, r) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.35);
      ctx.lineTo(-r * 0.4, -r * 0.4);
      ctx.moveTo(-r * 0.4, r * 0.35);
      ctx.lineTo(r * 0.45, r * 0.35);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-r * 0.4, r * 0.35, r * 0.35, -Math.PI / 2, -Math.PI / 10);
      ctx.stroke();
    }

    // ---------- Build the (single-colour) texture pool ----------
    var glyphs = ["\u03c0", "\u03a3", "\u221a", "\u221e", "\u222b", "\u0394", "\u00d7", "\u00f7", "\u00b1", "%"];
    var formulas = ["E=mc\u00b2", "a\u00b2+b\u00b2=c\u00b2", "\u03c0r\u00b2"];
    var textures = [];
    glyphs.forEach(function (g) {
      textures.push(makeTextTexture(g, 150));
    });
    formulas.forEach(function (f) {
      textures.push(makeTextTexture(f, 58));
    });
    [drawGraphCurve, drawFractionBar, drawAngle].forEach(function (fn) {
      textures.push(iconCanvas(fn));
    });

    // ---------- Sprites ----------
    var group = new THREE.Group();
    scene.add(group);
    var sprites = [];
    var count = isSmall ? 14 : reduceMotion ? 14 : 22;

    function visibleSizeAtZ(depth) {
      var vFov = (camera.fov * Math.PI) / 180;
      var height = 2 * Math.tan(vFov / 2) * Math.abs(camera.position.z - depth);
      var width = height * camera.aspect;
      return { width: width, height: height };
    }

    // Grid-jittered placement so glyphs spread across the whole section
    // instead of clumping behind one column of video cards.
    var cols = isSmall ? 4 : 7;
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
        opacity: 0.35 + Math.random() * 0.25 // soft — sits behind the real cards
      });
      var sprite = new THREE.Sprite(mat);
      var z = -5 + Math.random() * 7; // -5 .. 2
      var bounds = visibleSizeAtZ(z);
      var usableW = bounds.width * 0.96;
      var usableH = bounds.height * 0.9;

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
      var scale = 1.3 + Math.random() * 1.1;
      sprite.scale.set(scale, scale, 1);
      group.add(sprite);
      sprites.push({
        sprite: sprite,
        base: new THREE.Vector3(baseX, baseY, z),
        offset: new THREE.Vector2(0, 0),
        vel: new THREE.Vector2(0, 0),
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.3,
        floatAmp: 0.3 + Math.random() * 0.45,
        rotSpeed: (Math.random() - 0.5) * 0.1
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
