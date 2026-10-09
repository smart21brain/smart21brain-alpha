/* ============================================================
   Smart21Brain Library — Three.js interactive planets background
   A small stylised solar-field of glossy, lit 3D planets (rocky,
   banded gas giants, ocean worlds, ringed worlds, neon "cyber"
   worlds) drifting over a starfield on black, gently reacting to
   the mouse / touch cursor like a soft gravity field.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var host = document.getElementById("planetsCanvas");
    var section = host && host.closest(".section-planets");
    if (!host || !section || typeof THREE === "undefined") return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isSmall = window.innerWidth < 768;

    // ---------- Renderer / scene / camera ----------
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
    camera.position.z = 26;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      return; // WebGL unavailable — the CSS gradient still looks fine on its own
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
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

    // ---------- Lighting (gives the spheres real shaded, glossy volume) ----------
    scene.add(new THREE.AmbientLight(0x8892b0, 0.55));
    var sun = new THREE.DirectionalLight(0xfff3d6, 1.1);
    sun.position.set(-8, 6, 12);
    scene.add(sun);
    var rim = new THREE.DirectionalLight(0x7ba7ff, 0.5);
    rim.position.set(10, -4, -6);
    scene.add(rim);

    // ---------- Procedural planet textures ----------
    function ctxFor(w, h) {
      var cvs = document.createElement("canvas");
      cvs.width = w; cvs.height = h;
      return { cvs: cvs, ctx: cvs.getContext("2d") };
    }

    function rockyTexture(base, dark, light) {
      var o = ctxFor(512, 256), ctx = o.ctx;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 256);
      for (var i = 0; i < 90; i++) {
        var x = Math.random() * 512, y = Math.random() * 256, r = 4 + Math.random() * 22;
        var g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
        var c = Math.random() > 0.5 ? dark : light;
        g.addColorStop(0, c);
        g.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.35 + Math.random() * 0.3;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      var tex = new THREE.CanvasTexture(o.cvs);
      tex.needsUpdate = true;
      return tex;
    }

    function bandedTexture(colors) {
      var o = ctxFor(512, 256), ctx = o.ctx;
      var bandH = 256 / colors.length;
      for (var i = 0; i < colors.length; i++) {
        ctx.fillStyle = colors[i];
        var y0 = i * bandH;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (var x = 0; x <= 512; x += 16) {
          ctx.lineTo(x, y0 + Math.sin((x / 512) * Math.PI * 4 + i) * bandH * 0.18);
        }
        ctx.lineTo(512, y0 + bandH * 1.3);
        ctx.lineTo(0, y0 + bandH * 1.3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      // a "great spot" storm blob
      var sx = 130 + Math.random() * 250, sy = 90 + Math.random() * 80;
      var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 46);
      g.addColorStop(0, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 46, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      var tex = new THREE.CanvasTexture(o.cvs);
      tex.needsUpdate = true;
      return tex;
    }

    function oceanTexture(ocean, land, cloud) {
      var o = ctxFor(512, 256), ctx = o.ctx;
      ctx.fillStyle = ocean;
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = land;
      for (var i = 0; i < 10; i++) {
        var x = Math.random() * 512, y = 30 + Math.random() * 196, r = 18 + Math.random() * 34;
        ctx.beginPath();
        for (var a = 0; a < Math.PI * 2; a += 0.4) {
          var rr = r * (0.7 + Math.random() * 0.5);
          var px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.7;
          if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.strokeStyle = cloud;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 6;
      for (var c = 0; c < 6; c++) {
        var cy = Math.random() * 256;
        ctx.beginPath();
        ctx.moveTo(0, cy);
        for (var cx = 0; cx <= 512; cx += 24) {
          ctx.lineTo(cx, cy + Math.sin(cx * 0.02 + c) * 14);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      var tex = new THREE.CanvasTexture(o.cvs);
      tex.needsUpdate = true;
      return tex;
    }

    function cyberTexture(base, neon1, neon2) {
      var o = ctxFor(512, 256), ctx = o.ctx;
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 512, 256);
      function crack(startX, startY, color) {
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        var x = startX, y = startY;
        ctx.moveTo(x, y);
        for (var i = 0; i < 14; i++) {
          x += (Math.random() - 0.5) * 60;
          y += (Math.random() - 0.3) * 26;
          x = (x + 512) % 512;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      for (var i = 0; i < 5; i++) crack(Math.random() * 512, Math.random() * 256, neon1);
      for (var j = 0; j < 4; j++) crack(Math.random() * 512, Math.random() * 256, neon2);
      ctx.shadowBlur = 0;
      var tex = new THREE.CanvasTexture(o.cvs);
      tex.needsUpdate = true;
      return tex;
    }

    function ringTexture(color) {
      var o = ctxFor(256, 32), ctx = o.ctx;
      for (var x = 0; x < 256; x++) {
        var n = Math.sin(x * 0.35) * 0.5 + Math.sin(x * 0.09) * 0.5;
        var alpha = 0.25 + Math.max(0, n) * 0.55;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(x, 0, 1, 32);
      }
      ctx.globalAlpha = 1;
      var tex = new THREE.CanvasTexture(o.cvs);
      tex.needsUpdate = true;
      return tex;
    }

    // ---------- Planet "designs" — modern, slightly stylised palette ----------
    var designs = [
      { make: function () { return rockyTexture("#C1440E", "#7A2A08", "#FF9457"); }, ring: false },
      { make: function () { return rockyTexture("#8C8FA3", "#4B4E63", "#D7D9E6"); }, ring: false },
      { make: function () { return bandedTexture(["#FFB347", "#FF8C42", "#D9480F", "#FFD8A8", "#FF8C42"]); }, ring: true, ringColor: "#FFD8A8" },
      { make: function () { return bandedTexture(["#5B5FEF", "#7B61FF", "#3D2C8D", "#B39DFF", "#5B5FEF"]); }, ring: false },
      { make: function () { return oceanTexture("#0B4F6C", "#1FA37A", "#EAF6FF"); }, ring: false },
      { make: function () { return oceanTexture("#0E7C7B", "#FFD166", "#EAFFFB"); }, ring: true, ringColor: "#EAFFFB" },
      { make: function () { return cyberTexture("#120A22", "#00F0FF", "#FF2FD0"); }, ring: false },
      { make: function () { return cyberTexture("#0A1220", "#7CFFB2", "#FFD166"); }, ring: false }
    ];

    // ---------- Build planets ----------
    var group = new THREE.Group();
    scene.add(group);
    var planets = [];
    var count = isSmall ? 6 : reduceMotion ? 6 : 10;

    function visibleSizeAtZ(depth) {
      var vFov = (camera.fov * Math.PI) / 180;
      var height = 2 * Math.tan(vFov / 2) * Math.abs(camera.position.z - depth);
      var width = height * camera.aspect;
      return { width: width, height: height };
    }

    var cols = isSmall ? 3 : 5;
    var rows = Math.max(2, Math.ceil(count / cols));
    var cellOrder = [];
    for (var c = 0; c < cols * rows; c++) cellOrder.push(c);
    for (var sIdx = cellOrder.length - 1; sIdx > 0; sIdx--) {
      var rIdx = Math.floor(Math.random() * (sIdx + 1));
      var tmp = cellOrder[sIdx]; cellOrder[sIdx] = cellOrder[rIdx]; cellOrder[rIdx] = tmp;
    }

    var sphereGeo = new THREE.SphereGeometry(1, 28, 28);

    for (var i = 0; i < count; i++) {
      var design = designs[Math.floor(Math.random() * designs.length)];
      var tex = design.make();
      var mat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.65,
        metalness: 0.12,
        emissive: new THREE.Color(0x0b0b14),
        emissiveIntensity: 0.35
      });
      var mesh = new THREE.Mesh(sphereGeo, mat);

      var z = -9 + Math.random() * 11; // -9 .. 2
      var bounds = visibleSizeAtZ(z);
      var usableW = bounds.width * 0.92;
      var usableH = bounds.height * 0.86;
      var cell = cellOrder[i % cellOrder.length];
      var col = cell % cols;
      var row = Math.floor(cell / cols);
      var cellW = usableW / cols;
      var cellH = usableH / rows;
      var baseX = -usableW / 2 + cellW * (col + 0.5) + (Math.random() - 0.5) * cellW * 0.7;
      var baseY = -usableH / 2 + cellH * (row + 0.5) + (Math.random() - 0.5) * cellH * 0.7;

      var radius = 0.55 + Math.random() * 1.15;
      mesh.scale.setScalar(radius);
      mesh.position.set(baseX, baseY, z);
      mesh.rotation.x = (Math.random() - 0.5) * 0.6;
      mesh.rotation.z = (Math.random() - 0.5) * 0.4;
      group.add(mesh);

      if (design.ring) {
        var ringGeo = new THREE.RingGeometry(radius * 1.5, radius * 2.5, 64);
        // remap UV radially so the 1D ring texture reads across the band
        var uv = ringGeo.attributes.uv;
        var posAttr = ringGeo.attributes.position;
        var v3 = new THREE.Vector3();
        for (var vi = 0; vi < posAttr.count; vi++) {
          v3.fromBufferAttribute(posAttr, vi);
          var d = (v3.length() - radius * 1.5) / (radius * 2.5 - radius * 1.5);
          uv.setXY(vi, d, 0.5);
        }
        var ringMat = new THREE.MeshBasicMaterial({
          map: ringTexture(design.ringColor || "#ffffff"),
          transparent: true,
          side: THREE.DoubleSide,
          opacity: 0.85,
          depthWrite: false
        });
        var ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 + 0.5;
        ring.rotation.z = 0.25;
        mesh.add(ring);
      }

      // soft additive glow halo behind each planet for atmosphere
      var haloTex = (function () {
        var o = ctxFor(128, 128), ctx = o.ctx;
        var g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, "rgba(255,255,255,0.35)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
        var t = new THREE.CanvasTexture(o.cvs);
        t.needsUpdate = true;
        return t;
      })();
      var halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: haloTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5
      }));
      halo.scale.setScalar(radius * 3.4);
      mesh.add(halo);

      planets.push({
        mesh: mesh,
        base: new THREE.Vector3(baseX, baseY, z),
        offset: new THREE.Vector2(0, 0),
        vel: new THREE.Vector2(0, 0),
        phase: Math.random() * Math.PI * 2,
        speed: 0.12 + Math.random() * 0.18,
        floatAmp: 0.35 + Math.random() * 0.5,
        spin: 0.05 + Math.random() * 0.12
      });
    }

    // ---------- Starfield ----------
    var starCount = isSmall ? 220 : reduceMotion ? 200 : 420;
    var starGeo = new THREE.BufferGeometry();
    var starPos = new Float32Array(starCount * 3);
    var starColor = new Float32Array(starCount * 3);
    var tintOptions = [
      [1, 1, 1], [0.75, 0.85, 1], [1, 0.9, 0.75], [0.85, 1, 0.95]
    ];
    for (var s = 0; s < starCount; s++) {
      var sz = -18 + Math.random() * 24;
      var b = visibleSizeAtZ(sz);
      starPos[s * 3] = (Math.random() * 2 - 1) * b.width * 0.55;
      starPos[s * 3 + 1] = (Math.random() * 2 - 1) * b.height * 0.55;
      starPos[s * 3 + 2] = sz;
      var tint = tintOptions[Math.floor(Math.random() * tintOptions.length)];
      starColor[s * 3] = tint[0]; starColor[s * 3 + 1] = tint[1]; starColor[s * 3 + 2] = tint[2];
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute("color", new THREE.BufferAttribute(starColor, 3));
    var starMat = new THREE.PointsMaterial({
      size: 0.11,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    var stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // ---------- Mouse tracking (raycast onto z=0 plane) ----------
    var raycaster = new THREE.Raycaster();
    var ndc = new THREE.Vector2(9999, 9999);
    var mouseWorld = new THREE.Vector3(9999, 9999, 0);
    var groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    var pointerActive = false;

    function updatePointerFromEvent(clientX, clientY) {
      var rect = section.getBoundingClientRect();
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
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
      if (e.touches && e.touches[0]) updatePointerFromEvent(e.touches[0].clientX, e.touches[0].clientY);
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
    var gravityRadius = 10.5;
    var gravityStrength = 1.4;
    var coreRadius = 3.2;
    var repelStrength = 2.6;

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

      for (var i = 0; i < planets.length; i++) {
        var p = planets[i];
        var float = Math.sin(t * p.speed + p.phase) * p.floatAmp;
        var floatX = Math.cos(t * p.speed * 0.6 + p.phase) * p.floatAmp * 0.4;

        if (pointerActive && !reduceMotion) {
          var px = p.base.x + p.offset.x;
          var py = p.base.y + float * 0.3 + p.offset.y;
          var dx = mouseWorld.x - px;
          var dy = mouseWorld.y - py;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

          if (dist < gravityRadius) {
            var pull = (1 - dist / gravityRadius) * gravityStrength;
            p.vel.x += (dx / dist) * pull * 0.045;
            p.vel.y += (dy / dist) * pull * 0.045;
            p.vel.x += (-dy / dist) * pull * 0.02;
            p.vel.y += (dx / dist) * pull * 0.02;
          }
          if (dist < coreRadius) {
            var push = (1 - dist / coreRadius) * repelStrength;
            p.vel.x += (-dx / dist) * push * 0.08;
            p.vel.y += (-dy / dist) * push * 0.08;
          }
        }
        p.vel.x += -p.offset.x * 0.014;
        p.vel.y += -p.offset.y * 0.014;
        p.vel.x *= 0.93;
        p.vel.y *= 0.93;
        p.offset.x += p.vel.x;
        p.offset.y += p.vel.y;

        p.mesh.position.x = p.base.x + p.offset.x + floatX;
        p.mesh.position.y = p.base.y + p.offset.y + float;
        p.mesh.rotation.y += p.spin * 0.02;
      }

      stars.rotation.y = t * 0.006;
      sun.position.x = -8 + Math.sin(t * 0.05) * 2;

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
