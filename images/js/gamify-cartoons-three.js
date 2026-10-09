/* ============================================================
   Smart21Brain — Gamification section
   Three.js interactive CARTOON MASCOTS background layer.
   Fully original toy-style characters (star, trophy, rocket,
   book, game-controller, lightbulb) with big googly eyes that
   follow the mouse / touch cursor and gently bounce away from
   it, floating over a transparent canvas so the section's own
   background color (bg-secondary-soft) shows through unchanged.
   ============================================================ */
(function () {
  "use strict";

  function init() {
    var host = document.getElementById("gamifyCanvas");
    var section = host && host.closest(".section-gamify");
    if (!host || !section || typeof THREE === "undefined") return;

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var isSmall = window.innerWidth < 768;

    // ---------- Renderer / scene / camera ----------
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 14;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch (e) {
      return; // no WebGL — the plain bg-secondary-soft background still looks fine
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0); // fully transparent — background color stays exactly the same
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

    // ---------- Toon-style lighting ----------
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    var key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(-6, 8, 10);
    scene.add(key);
    var fill = new THREE.DirectionalLight(0xffe9c2, 0.35);
    fill.position.set(6, -3, 6);
    scene.add(fill);

    // ---------- 4-step toon gradient map ----------
    var gradientMap = (function () {
      var cvs = document.createElement("canvas");
      cvs.width = 4; cvs.height = 1;
      var ctx = cvs.getContext("2d");
      var img = ctx.createImageData(4, 1);
      var shades = [95, 160, 215, 255];
      for (var i = 0; i < 4; i++) {
        img.data[i * 4] = shades[i];
        img.data[i * 4 + 1] = shades[i];
        img.data[i * 4 + 2] = shades[i];
        img.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      var tex = new THREE.CanvasTexture(cvs);
      tex.minFilter = THREE.NearestFilter;
      tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false;
      return tex;
    })();

    var INK = 0x24263A;

    function toonMat(color) {
      return new THREE.MeshToonMaterial({ color: color, gradientMap: gradientMap });
    }

    function addOutline(mesh, scale, color) {
      var outline = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: color || INK, side: THREE.BackSide }));
      outline.scale.multiplyScalar(scale || 1.08);
      mesh.add(outline);
      return outline;
    }

    // ---------- Googly eyes + smile + blush, the "cartoon" touch on every mascot ----------
    var whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var pupilMat = new THREE.MeshBasicMaterial({ color: INK });
    var blushMat = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.55 });

    function addFace(parent, pos, scale) {
      var eyeR = 0.15 * scale;
      var spacing = 0.22 * scale;
      var eyes = [];
      for (var s = -1; s <= 1; s += 2) {
        var socket = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 12, 12), whiteMat);
        socket.position.set(pos.x + s * spacing, pos.y, pos.z);
        parent.add(socket);
        var pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.52, 10, 10), pupilMat);
        pupil.position.set(0, 0, eyeR * 0.7);
        socket.add(pupil);
        eyes.push({ pupil: pupil, max: eyeR * 0.42 });
      }
      var mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13 * scale, 0.032 * scale, 8, 16, Math.PI), pupilMat);
      mouth.position.set(pos.x, pos.y - eyeR * 1.9, pos.z * 0.97);
      mouth.rotation.z = Math.PI; // flips the arc into a smiling "cup" shape
      parent.add(mouth);
      var blushGeo = new THREE.CircleGeometry(0.085 * scale, 16);
      for (var b = -1; b <= 1; b += 2) {
        var blush = new THREE.Mesh(blushGeo, blushMat);
        blush.position.set(pos.x + b * (spacing * 1.9), pos.y - eyeR * 0.5, pos.z * 0.95);
        parent.add(blush);
      }
      return eyes;
    }

    // ---------- Original cartoon mascot designs ----------
    function buildStar(color) {
      var g = new THREE.Group();
      var spikes = 5, outerR = 1, innerR = 0.42, pts = [];
      for (var i = 0; i < spikes * 2; i++) {
        var r = (i % 2 === 0) ? outerR : innerR;
        var ang = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
        pts.push(new THREE.Vector2(Math.cos(ang) * r, Math.sin(ang) * r));
      }
      var geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.46, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 2 });
      geo.center();
      var body = new THREE.Mesh(geo, toonMat(color));
      addOutline(body, 1.07);
      g.add(body);
      var eyes = addFace(g, new THREE.Vector3(0, 0.06, 0.34), 0.95);
      return { group: g, eyes: eyes };
    }

    function buildTrophy(color) {
      var g = new THREE.Group();
      var pts = [
        new THREE.Vector2(0.0, 0.0), new THREE.Vector2(0.5, 0.0), new THREE.Vector2(0.5, 0.12),
        new THREE.Vector2(0.2, 0.16), new THREE.Vector2(0.16, 0.5), new THREE.Vector2(0.4, 0.6),
        new THREE.Vector2(0.46, 0.92), new THREE.Vector2(0.3, 1.1), new THREE.Vector2(0.0, 1.15)
      ];
      var geo = new THREE.LatheGeometry(pts, 24);
      var body = new THREE.Mesh(geo, toonMat(color));
      body.position.y = -0.55;
      addOutline(body, 1.06);
      g.add(body);
      var handleGeo = new THREE.TorusGeometry(0.24, 0.055, 8, 16, Math.PI * 1.25);
      for (var s = -1; s <= 1; s += 2) {
        var handle = new THREE.Mesh(handleGeo, toonMat(color));
        handle.position.set(s * 0.43, 0.06, 0);
        handle.rotation.y = Math.PI / 2;
        handle.rotation.z = s > 0 ? 0.55 : Math.PI - 0.55;
        g.add(handle);
      }
      var eyes = addFace(g, new THREE.Vector3(0, 0.1, 0.46), 0.8);
      return { group: g, eyes: eyes };
    }

    function buildRocket(color) {
      var g = new THREE.Group();
      var nose = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.55, 16), toonMat(color));
      nose.position.y = 0.72;
      addOutline(nose, 1.08);
      g.add(nose);
      var body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.05, 16), toonMat(color));
      body.position.y = 0.02;
      addOutline(body, 1.06);
      g.add(body);
      var finMat = toonMat(0xFF5D5D);
      for (var s = -1; s <= 1; s += 2) {
        var fin = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.46, 4), finMat);
        fin.position.set(s * 0.4, -0.48, 0);
        fin.rotation.z = s > 0 ? -Math.PI / 2.6 : Math.PI / 2.6;
        g.add(fin);
      }
      var win = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), new THREE.MeshBasicMaterial({ color: 0xBFE8FF }));
      win.position.set(0, 0.24, 0.4);
      g.add(win);
      var ring = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.21, 20), pupilMat);
      ring.position.set(0, 0.24, 0.402);
      g.add(ring);
      var eyes = addFace(g, new THREE.Vector3(0, -0.36, 0.41), 0.62);
      return { group: g, eyes: eyes };
    }

    function buildBook(color) {
      var g = new THREE.Group();
      var cover = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.36, 0.22), toonMat(color));
      addOutline(cover, 1.05);
      g.add(cover);
      var pages = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.22, 0.08), toonMat(0xFFF6E0));
      pages.position.z = 0.15;
      g.add(pages);
      var eyes = addFace(g, new THREE.Vector3(0, 0.1, 0.2), 0.78);
      return { group: g, eyes: eyes };
    }

    function buildController(color) {
      var g = new THREE.Group();
      var body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.58, 0.34), toonMat(color));
      addOutline(body, 1.07);
      g.add(body);
      var stickMat = toonMat(INK);
      for (var s = -1; s <= 1; s += 2) {
        var stick = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.11, 16), stickMat);
        stick.position.set(s * 0.4, 0.04, 0.21);
        stick.rotation.x = Math.PI / 2;
        g.add(stick);
      }
      var btnColors = [0xFF5D5D, 0xFFD166, 0x4DABF7, 0x6BCF7F];
      for (var b = 0; b < 4; b++) {
        var ang = (b / 4) * Math.PI * 2;
        var btn = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 12), toonMat(btnColors[b]));
        btn.position.set(0.52 + Math.cos(ang) * 0.11, 0.04 + Math.sin(ang) * 0.11, 0.19);
        g.add(btn);
      }
      var eyes = addFace(g, new THREE.Vector3(0, -0.24, 0.18), 0.56);
      return { group: g, eyes: eyes };
    }

    function buildBulb(color) {
      var g = new THREE.Group();
      var glass = new THREE.Mesh(new THREE.SphereGeometry(0.58, 20, 20), toonMat(color));
      glass.position.y = 0.33;
      addOutline(glass, 1.06);
      g.add(glass);
      var base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.38, 16), toonMat(0xB0B0B0));
      base.position.y = -0.44;
      g.add(base);
      for (var t = 0; t < 3; t++) {
        var thread = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.028, 8, 16), toonMat(0x8C8C8C));
        thread.rotation.x = Math.PI / 2;
        thread.position.y = -0.3 + t * 0.13;
        g.add(thread);
      }
      var eyes = addFace(g, new THREE.Vector3(0, 0.33, 0.48), 0.72);
      return { group: g, eyes: eyes };
    }

    var builders = [
      { fn: buildStar, color: 0xFFC93C },
      { fn: buildTrophy, color: 0xFFD166 },
      { fn: buildRocket, color: 0x3A86FF },
      { fn: buildBook, color: 0x06A77D },
      { fn: buildController, color: 0x7B61FF },
      { fn: buildBulb, color: 0xFF8C42 }
    ];
    for (var sh = builders.length - 1; sh > 0; sh--) {
      var rj = Math.floor(Math.random() * (sh + 1));
      var tmp = builders[sh]; builders[sh] = builders[rj]; builders[rj] = tmp;
    }

    // ---------- Place mascots on a scattered grid ----------
    function visibleSizeAtZ(depth) {
      var vFov = (camera.fov * Math.PI) / 180;
      var height = 2 * Math.tan(vFov / 2) * Math.abs(camera.position.z - depth);
      return { width: height * camera.aspect, height: height };
    }

    var count = isSmall ? 4 : reduceMotion ? 4 : 6;
    var cols = isSmall ? 2 : 3;
    var rows = Math.max(2, Math.ceil(count / cols));
    var cellOrder = [];
    for (var c = 0; c < cols * rows; c++) cellOrder.push(c);
    for (var sIdx = cellOrder.length - 1; sIdx > 0; sIdx--) {
      var rIdx = Math.floor(Math.random() * (sIdx + 1));
      var t2 = cellOrder[sIdx]; cellOrder[sIdx] = cellOrder[rIdx]; cellOrder[rIdx] = t2;
    }

    var mascots = [];
    for (var i = 0; i < count; i++) {
      var pick = builders[i % builders.length];
      var built = pick.fn(pick.color);

      var z = -4.5 + Math.random() * 4; // -4.5 .. -0.5
      var bounds = visibleSizeAtZ(z);
      var usableW = bounds.width * 0.94;
      var usableH = bounds.height * 0.88;
      var cell = cellOrder[i % cellOrder.length];
      var col = cell % cols;
      var row = Math.floor(cell / cols);
      var cellW = usableW / cols;
      var cellH = usableH / rows;
      var baseX = -usableW / 2 + cellW * (col + 0.5) + (Math.random() - 0.5) * cellW * 0.6;
      var baseY = -usableH / 2 + cellH * (row + 0.5) + (Math.random() - 0.5) * cellH * 0.6;

      var scale = 0.55 + Math.random() * 0.4;
      built.group.scale.setScalar(scale);
      built.group.position.set(baseX, baseY, z);
      built.group.rotation.z = (Math.random() - 0.5) * 0.25;
      scene.add(built.group);

      mascots.push({
        group: built.group,
        eyes: built.eyes,
        base: new THREE.Vector3(baseX, baseY, z),
        offset: new THREE.Vector2(0, 0),
        vel: new THREE.Vector2(0, 0),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.35,
        floatAmp: 0.22 + Math.random() * 0.18,
        swayAmp: 0.08 + Math.random() * 0.08,
        baseScale: scale,
        squash: 0
      });
    }

    // ---------- Mouse tracking (raycast onto z=0 plane of the section) ----------
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

    // ---------- Pause when off-screen ----------
    var isVisible = true;
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        isVisible = entries[0].isIntersecting;
      }, { threshold: 0.05 });
      io.observe(section);
    }

    // ---------- Animate: float, react to cursor, and look at it ----------
    var clock = new THREE.Clock();
    var gravityRadius = 5.2;
    var gravityStrength = 1.1;
    var coreRadius = 1.9;
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

      for (var i = 0; i < mascots.length; i++) {
        var m = mascots[i];
        var float = Math.sin(t * m.speed + m.phase) * m.floatAmp;
        var px = m.base.x + m.offset.x;
        var py = m.base.y + float + m.offset.y;
        var targetSquash = 0;
        var lookX = 0, lookY = 0;

        if (pointerActive && !reduceMotion) {
          var dx = mouseWorld.x - px;
          var dy = mouseWorld.y - py;
          var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

          // gentle drift toward the cursor from afar
          if (dist < gravityRadius) {
            var pull = (1 - dist / gravityRadius) * gravityStrength;
            m.vel.x += (dx / dist) * pull * 0.05;
            m.vel.y += (dy / dist) * pull * 0.05;
          }
          // bounce away — like a toy startled by a poke — once the cursor gets close
          if (dist < coreRadius) {
            var push = (1 - dist / coreRadius) * repelStrength;
            m.vel.x += (-dx / dist) * push * 0.09;
            m.vel.y += (-dy / dist) * push * 0.09;
            targetSquash = (1 - dist / coreRadius) * 0.28;
          }
          // googly eyes track the cursor
          lookX = Math.max(-1, Math.min(1, dx / gravityRadius));
          lookY = Math.max(-1, Math.min(1, dy / gravityRadius));
        }

        m.vel.x += -m.offset.x * 0.02;
        m.vel.y += -m.offset.y * 0.02;
        m.vel.x *= 0.9;
        m.vel.y *= 0.9;
        m.offset.x += m.vel.x;
        m.offset.y += m.vel.y;

        m.group.position.x = px;
        m.group.position.y = py;
        m.group.rotation.z = Math.sin(t * m.speed * 0.7 + m.phase) * m.swayAmp;

        m.squash += (targetSquash - m.squash) * 0.18;
        var sx = m.baseScale * (1 - m.squash * 0.5);
        var sy = m.baseScale * (1 + m.squash * 0.7);
        m.group.scale.set(sx, sy, m.baseScale);

        for (var e = 0; e < m.eyes.length; e++) {
          var eye = m.eyes[e];
          eye.pupil.position.x += (lookX * eye.max - eye.pupil.position.x) * 0.25;
          eye.pupil.position.y += (-lookY * eye.max - eye.pupil.position.y) * 0.25;
        }
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
