(function () {
  const $ = id => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const D2R = Math.PI / 180;
  const fmt = n => Number(n).toLocaleString('en-US');

  // ---------------------------------------------------------------- quality tiers (auto-detected, overridable with ?q=ultra|high|mobile)
  const TIERS = {
    ultra: { pr: 2, shadow: 4096, sao: true, bloom: true, lite: false, tex: '1k', lod: 900, fog: 0.00062, samples: 64, photoMax: 3840 },
    high: { pr: 1.5, shadow: 2048, sao: true, bloom: false, lite: false, tex: '1k', lod: 420, fog: 0.00062, samples: 32, photoMax: 2560 },
    mobile: { pr: 1.25, shadow: 2048, sao: false, bloom: false, lite: true, tex: '512', lod: 0, fog: 0.0005, samples: 12, photoMax: 1600 },
  };
  function detectTier() {
    const ua = navigator.userAgent, touch = navigator.maxTouchPoints > 1, small = Math.max(screen.width, screen.height) < 1400;
    if (/Mobi|Android|iPhone|iPad/i.test(ua) || (touch && small) || (touch && /Macintosh/.test(ua))) return 'mobile';
    let gpu = '';
    try { const gl = document.createElement('canvas').getContext('webgl'), e = gl && gl.getExtension('WEBGL_debug_renderer_info'); gpu = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : ''; } catch (e) { }
    if (/swiftshader|llvmpipe|software/i.test(gpu)) return 'high';
    if (/nvidia|geforce|rtx|gtx|quadro|radeon (rx|pro)|apple m\d (pro|max|ultra)|apple gpu/i.test(gpu) && (navigator.hardwareConcurrency || 4) >= 8) return 'ultra';
    return 'high';
  }
  const qk = ({ low: 'mobile', lite: 'mobile' })[Q.get('q')] || Q.get('q');
  const TIER = TIERS[qk] ? qk : detectTier(), T = TIERS[TIER]; window.LC_TIER = TIER;

  try {
    const view = $('view');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    const basePR = window.CLEAN ? 1 : Math.min(window.devicePixelRatio || 1, T.pr);
    renderer.setPixelRatio(basePR);
    renderer.setSize(view.clientWidth, view.clientHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    view.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, view.clientWidth / view.clientHeight, 1, 7000);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 4; controls.maxDistance = 2600;

    // ---------------------------------------------------------------- atmosphere: sky dome, distance haze, image-based light (procedural first, CC0 HDR sky when it arrives)
    const skyU = { sunDir: { value: new THREE.Vector3(0, 1, 0) }, warm: { value: 0.6 } };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'uniform vec3 sunDir; uniform float warm; varying vec3 vD;',
        'void main(){ vec3 d = normalize(vD); float h = d.y;',
        ' vec3 zen = mix(vec3(0.30,0.46,0.70), vec3(0.34,0.44,0.62), warm);',
        ' vec3 hor = mix(vec3(0.86,0.86,0.82), vec3(1.0,0.80,0.56), warm);',
        ' vec3 c = mix(hor, zen, pow(clamp(h,0.0,1.0), 0.48));',
        ' if (h < 0.0) c = mix(hor, vec3(0.52,0.46,0.38), clamp(-h*5.0,0.0,1.0));',
        ' float s = max(dot(d, normalize(sunDir)), 0.0);',
        ' c += vec3(1.0,0.74,0.46) * (pow(s, 6.0) * 0.45 * (0.4 + warm) + pow(s, 900.0) * 6.0);',
        ' gl_FragColor = vec4(c, 1.0); }'].join('\n')
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 24), skyMat); sky.renderOrder = -10; scene.add(sky);
    scene.fog = new THREE.FogExp2(0xffffff, T.fog);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), skyMat));
    const hdrScene = new THREE.Scene(), hdrMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false, color: 0xffffff }); const hdrSphere = new THREE.Mesh(new THREE.SphereGeometry(100, 48, 24), hdrMat); hdrScene.add(hdrSphere);
    let envRT = null, hdrReady = false, hdrSunAz = 0;
    const hemi = new THREE.HemisphereLight(0xc4d4e6, 0x5b5040, 0.5); scene.add(hemi);

    const env = { lite: T.lite, tex: window.TEXMAN, canvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } };
    const B = buildCommons(THREE, window.LAYOUT, window.SCENE, env);
    scene.add(B.root);
    const W = B.W, S = B.site;
    B.groups.labels.visible = false;

    // ---------------------------------------------------------------- sun (real Portland solar position, NOAA approximation)
    const sun = new THREE.DirectionalLight(0xffd2a0, 2.6); sun.castShadow = true;
    const SM = window.CLEAN ? 2048 : T.shadow;
    sun.shadow.mapSize.set(SM, SM); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.5; sun.shadow.radius = 2;
    const sc = sun.shadow.camera; sc.left = -420; sc.right = 420; sc.top = 340; sc.bottom = -340; sc.near = 10; sc.far = 3600; sc.updateProjectionMatrix();
    sun.target.position.copy(W(S.cx, S.cy, 0)); scene.add(sun); scene.add(sun.target);
    const LAT = 45.5266, LON = -122.6647;
    function solar(doy, hour) {
      const tz = doy >= 70 && doy <= 307 ? -7 : -8, g = 2 * Math.PI / 365 * (doy - 1 + (hour - 12) / 24);
      const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
      const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
      const ha = ((hour * 60 + eqt + 4 * LON - 60 * tz) / 4 - 180) * D2R, la = LAT * D2R;
      const alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha));
      const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(la) - Math.tan(dec) * Math.cos(la)) + Math.PI;
      return { alt, az };
    }
    const SUN = { doy: 280, hour: 16.25, alt: 0, az: 0 };
    let envTimer = 0;
    function rebuildEnv() {
      if (envRT) envRT.dispose();
      if (hdrReady && SUN.alt > 4 * D2R) { hdrSphere.rotation.y = -(SUN.az - hdrSunAz); const k = 0.4 + Math.min(1, SUN.alt / (35 * D2R)) * 0.16; hdrMat.color.setRGB(k, k * (0.97 - skyU.warm.value * 0.05), k * (0.93 - skyU.warm.value * 0.12)); envRT = pmrem.fromScene(hdrScene, 0.0); }
      else envRT = pmrem.fromScene(envScene, 0.02);
      scene.environment = envRT.texture; dirty();
    }
    function setSun(doy, hour) {
      const p = solar(doy, hour); Object.assign(SUN, { doy, hour, alt: p.alt, az: p.az });
      const al = Math.max(p.alt, 0.035), R = 1600;
      const dir = new THREE.Vector3(Math.sin(p.az) * Math.cos(al), Math.sin(al), -Math.cos(p.az) * Math.cos(al));
      sun.position.copy(sun.target.position).addScaledVector(dir, R);
      const warm = THREE.MathUtils.clamp(1.25 - p.alt / (40 * D2R), 0, 1);
      sun.color.setRGB(1, 0.93 - warm * 0.16, 0.84 - warm * 0.3);
      sun.intensity = p.alt <= 0 ? 0.25 : 1.4 + Math.min(1, p.alt / (25 * D2R)) * 1.4;
      hemi.intensity = 0.26 + Math.min(1, Math.max(0, p.alt) / (40 * D2R)) * 0.14;
      skyU.sunDir.value.copy(dir); skyU.warm.value = warm;
      scene.fog.color.setRGB(0.95 + warm * 0.04, 0.9 - warm * 0.02, 0.8 - warm * 0.07);
      clearTimeout(envTimer); envTimer = setTimeout(rebuildEnv, envRT ? 120 : 0);
      const lbl = $('sunReadout'); if (lbl) { const d = new Date(2026, 0, doy); const hh = Math.floor(hour), mm = Math.round((hour - hh) * 60); lbl.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' + ((hh + 11) % 12 + 1) + ':' + String(mm).padStart(2, '0') + (hh < 12 ? ' am' : ' pm') + ' · sun ' + Math.round(p.alt / D2R) + '° alt, ' + Math.round(p.az / D2R) + '° az'; }
      dirty();
    }

    // ---------------------------------------------------------------- post: SAO (idle frames), bloom on bright glass (Ultra), tilt-shift (option), editorial grade
    const GradeShader = {
      uniforms: { tDiffuse: { value: null }, vig: { value: 0.3 }, time: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: [
        'uniform sampler2D tDiffuse; uniform float vig; uniform float time; varying vec2 vUv;',
        'vec3 srgb(vec3 c){ c = clamp(c,0.0,1.0); return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }',
        'float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + time) * 43758.5453); }',
        'void main(){ vec3 c = srgb(texture2D(tDiffuse, vUv).rgb);',
        ' float l = dot(c, vec3(0.299,0.587,0.114));',
        ' c = mix(vec3(l), c, 1.07);',
        ' c += (c - 0.5) * 0.05;',
        ' c *= mix(vec3(0.985,0.99,1.02), vec3(1.025,1.0,0.965), smoothstep(0.25,0.85,l));',
        ' float d = distance(vUv, vec2(0.5)); c *= 1.0 - vig * smoothstep(0.42, 0.9, d);',
        ' c += (rnd(vUv * 731.0) - 0.5) / 255.0;',
        ' gl_FragColor = vec4(c, 1.0); }'].join('\n')
    };
    const PASS = {};
    let composer = null;
    if (THREE.EffectComposer) {
      const gl2 = renderer.capabilities.isWebGL2, sz = new THREE.Vector2(); renderer.getDrawingBufferSize(sz);
      const rt = gl2 && !T.lite ? new THREE.WebGLMultisampleRenderTarget(sz.x, sz.y, { format: THREE.RGBAFormat, type: THREE.HalfFloatType }) : new THREE.WebGLRenderTarget(sz.x, sz.y, { format: THREE.RGBAFormat, type: gl2 ? THREE.HalfFloatType : THREE.UnsignedByteType });
      composer = new THREE.EffectComposer(renderer, rt);
      composer.addPass(PASS.render = new THREE.RenderPass(scene, camera));
      if (T.sao && THREE.SAOPass) { PASS.sao = new THREE.SAOPass(scene, camera, false, false, new THREE.Vector2(sz.x, sz.y)); Object.assign(PASS.sao.params, SAOP()); composer.addPass(PASS.sao); }
      if (T.bloom && THREE.UnrealBloomPass) { PASS.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(sz.x, sz.y), 0.22, 0.55, 0.86); composer.addPass(PASS.bloom); }
      if (THREE.HorizontalTiltShiftShader) { PASS.tiltH = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader); PASS.tiltV = new THREE.ShaderPass(THREE.VerticalTiltShiftShader); PASS.tiltH.enabled = PASS.tiltV.enabled = false; composer.addPass(PASS.tiltH); composer.addPass(PASS.tiltV); }
      composer.addPass(PASS.grade = new THREE.ShaderPass(GradeShader));
    }
    function SAOP() { return { saoBias: 0.25, saoIntensity: 0.08, saoScale: 800, saoKernelRadius: 22, saoMinResolution: 0, saoBlur: true, saoBlurRadius: 4, saoBlurStdDev: 3, saoBlurDepthCutoff: 0.0005 }; }
    function setTilt(on) { if (!PASS.tiltH) return; PASS.tiltH.enabled = PASS.tiltV.enabled = !!on; const w = renderer.domElement.width, h = renderer.domElement.height; PASS.tiltH.uniforms.h.value = 2.2 / w; PASS.tiltV.uniforms.v.value = 2.2 / h; PASS.tiltH.uniforms.r.value = PASS.tiltV.uniforms.r.value = 0.45; dirty(); }

    // ---------------------------------------------------------------- render on demand (AO + bloom resolve when the camera settles), LOD, fountain animation
    let needs = 2, lastMove = 0, aoDone = false, locked = false;
    function dirty() { needs = 2; lastMove = performance.now(); aoDone = false; }
    controls.addEventListener('change', dirty);
    function draw(withAO) {
      if (composer) { if (PASS.sao) PASS.sao.enabled = !!withAO; if (PASS.bloom) PASS.bloom.enabled = !!withAO; composer.render(); }
      else renderer.render(scene, camera);
    }
    const lodV = new THREE.Vector3(); let lodAt = null;
    function updateLOD() { if (!B.lod.length) return; if (lodAt && lodAt.distanceToSquared(camera.position) < 25) return; lodAt = (lodAt || new THREE.Vector3()).copy(camera.position);
      B.lod.forEach(l => { l.m.visible = camera.position.distanceTo(l.c) - l.r < T.lod; }); }

    // ---------------------------------------------------------------- camera presets, eased flights
    const P = Object.assign({}, B.presets, {
      plazaref: { pos: [652, 512, 32], tgt: [700, 626, 9], fov: 52 },
      spine: { pos: [646, 671, 16], tgt: [900, 680, 9], fov: 52 },
      overview: { pos: [470, 380, 430], tgt: [880, 655, 0], fov: 42 },
      vaults: { pos: [700, 560, 70], tgt: [860, 625, 14], fov: 46 },
      hallroof: { pos: [960, 540, 95], tgt: [895, 619, 22], fov: 44 },
      roofcommons: { pos: [730, 590, 48], tgt: [820, 630, 15], fov: 50 },
      context: { pos: [380, 160, 720], tgt: [880, 640, 0], fov: 42 },
      siteplan: { pos: [889.8, 635.3, 1264], tgt: [889.8, 635.4, 0], fov: 30 },
    });
    const pose = () => ({ pos: [camera.position.x, -camera.position.z, camera.position.y], tgt: [controls.target.x, -controls.target.z, controls.target.y], fov: camera.fov });
    function apply(p) { camera.position.copy(W(p.pos[0], p.pos[1], p.pos[2])); controls.target.copy(W(p.tgt[0], p.tgt[1], p.tgt[2])); camera.fov = p.fov || 42; camera.near = p.pos[2] < 30 ? 0.3 : 1; camera.updateProjectionMatrix(); controls.update(); dirty(); }
    let flight = null;
    function flyTo(p, dur) {
      if (typeof p === 'string') p = P[p]; if (!p) return;
      if (!dur) { flight = null; apply(p); return; }
      flight = { a: pose(), b: { pos: p.pos, tgt: p.tgt, fov: p.fov || 42 }, t0: performance.now(), dur };
    }
    const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    function stepFlight(now) {
      if (!flight) return; const t = Math.min(1, (now - flight.t0) / flight.dur), e = ease(t), L = (x, y) => x + (y - x) * e;
      const a = flight.a, b = flight.b, d = Math.hypot(b.pos[0] - a.pos[0], b.pos[1] - a.pos[1]), lift = Math.sin(Math.PI * e) * Math.min(120, d * 0.18);
      apply({ pos: [L(a.pos[0], b.pos[0]), L(a.pos[1], b.pos[1]), L(a.pos[2], b.pos[2]) + lift], tgt: [L(a.tgt[0], b.tgt[0]), L(a.tgt[1], b.tgt[1]), L(a.tgt[2], b.tgt[2])], fov: L(a.fov, b.fov) });
      if (t >= 1) flight = null;
    }
    window.GO = k => flyTo(k, 0); window.PRESETS = P;

    // ---------------------------------------------------------------- hero idle orbit + spine walk
    let orbit = null;
    function startOrbit() { const c = W(845, 640, 0); const off = camera.position.clone().sub(c); orbit = { c, r: Math.hypot(off.x, off.z), h: off.y, a: Math.atan2(off.z, off.x) }; controls.target.copy(c); }
    function stepOrbit(dt) { if (!orbit) return; orbit.a += dt * 0.00004; camera.position.set(orbit.c.x + Math.cos(orbit.a) * orbit.r, orbit.c.y + orbit.h, orbit.c.z + Math.sin(orbit.a) * orbit.r); controls.target.copy(orbit.c); controls.update(); dirty(); }
    let walk = null;
    function walkAt(t) { const x = 640 + (1088 - 640) * t; apply({ pos: [x, 677, 1.7], tgt: [x + 40, 677, 4.5], fov: 62 }); }
    function stepWalk(dt) { if (!walk || !walk.play) return; walk.t = Math.min(1, walk.t + dt / 90000); walkAt(walk.t); const s = $('walkSlider'); if (s) s.value = Math.round(walk.t * 1000); if (walk.t >= 1) walk.play = false; }

    // ---------------------------------------------------------------- Gaussian splat context layer (.splat: 32 B/splat; pos f32x3, scale f32x3, rgba u8x4, rot u8x4)
    const SPLAT = { mesh: null, url: Q.get('splat') || window.SPLAT_URL || '', sortT: 0 };
    async function loadSplat(url) {
      const st = $('splatStatus'); if (st) st.textContent = 'Loading capture…';
      const buf = await (await fetch(url)).arrayBuffer(), n = Math.floor(buf.byteLength / 32), f = new Float32Array(buf), u = new Uint8Array(buf);
      const pos = new Float32Array(n * 3), colr = new Float32Array(n * 4), size = new Float32Array(n);
      const off = (Q.get('splatoff') || '0,0,0,0,1').split(',').map(Number);
      const cy = Math.cos(off[3] * D2R), sy = Math.sin(off[3] * D2R), k = off[4] || 1;
      for (let i = 0; i < n; i++) { const x = f[i * 8], y = f[i * 8 + 1], z = f[i * 8 + 2];
        const ex = (x * cy - z * sy) * k, ez = (x * sy + z * cy) * k; const w = W(off[0] + ex, off[1] - ez, off[2] - y * k);
        pos[i * 3] = w.x; pos[i * 3 + 1] = w.y; pos[i * 3 + 2] = w.z;
        size[i] = Math.max(f[i * 8 + 3], f[i * 8 + 4], f[i * 8 + 5]) * k * 2.6;
        for (let c = 0; c < 4; c++) colr[i * 4 + c] = u[i * 32 + 24 + c] / 255; }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('acolor', new THREE.BufferAttribute(colr, 4)); g.setAttribute('asize', new THREE.BufferAttribute(size, 1));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { vh: { value: view.clientHeight } },
        vertexShader: 'attribute vec4 acolor; attribute float asize; uniform float vh; varying vec4 vC; void main(){ vC = acolor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = clamp(asize * vh * projectionMatrix[1][1] / -mv.z, 1.0, 64.0); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float a = exp(-dot(d,d) * 16.0) * vC.a; if (a < 0.02) discard; gl_FragColor = vec4(pow(vC.rgb, vec3(2.2)), a); }' });
      SPLAT.mesh = new THREE.Points(g, m); SPLAT.mesh.renderOrder = 5; SPLAT.mesh.frustumCulled = false; scene.add(SPLAT.mesh); sortSplat();
      if (st) st.textContent = fmt(n) + ' splats loaded'; dirty();
    }
    function sortSplat() {
      const g = SPLAT.mesh.geometry, p = g.attributes.position.array, n = p.length / 3, e = camera.matrixWorldInverse.elements, d = new Float32Array(n), idx = new Uint32Array(n);
      for (let i = 0; i < n; i++) { d[i] = e[2] * p[i * 3] + e[6] * p[i * 3 + 1] + e[10] * p[i * 3 + 2]; idx[i] = i; }
      idx.sort((a, b) => d[a] - d[b]); g.setIndex(new THREE.BufferAttribute(idx, 1));
    }

    // ---------------------------------------------------------------- staged photographic materials (CC0 scans) + HDR sky
    const LOADING = { total: 0, done: 0 };
    function streamTextures() {
      const base = window.TEX_BASE, man = window.TEXMAN; if (!base || !man) return;
      const loader = new THREE.TextureLoader(), cache = {}, aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()), imgs = {};
      const tick = () => { LOADING.done++; window.dispatchEvent(new CustomEvent('lc-loading', { detail: LOADING })); dirty(); };
      const get = (key, tag, tile) => { const k = key + tag + tile; if (cache[k]) return cache[k];
        LOADING.total++; const t = loader.load(base + T.tex + '/' + key + '_' + tag + '.jpg', tx => { if (tag === 'd') imgs[key] = tx.image; tick(); }, undefined, tick);
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / tile, 1 / tile); t.anisotropy = aniso; if (tag === 'd') t.encoding = THREE.sRGBEncoding; return (cache[k] = t); };
      B.photoMats.forEach(m => { const ph = m.userData.photo, st = man.sets[ph.key]; if (!st) return;
        m.map = get(ph.key, 'd', ph.tile); if (st.maps.indexOf('n') >= 0) { m.normalMap = get(ph.key, 'n', ph.tile); m.normalScale.set(ph.ns, ph.ns); } if (st.maps.indexOf('r') >= 0) m.roughnessMap = get(ph.key, 'r', ph.tile);
        m.color.setRGB(Math.pow(ph.tint[0], 2.2), Math.pow(ph.tint[1], 2.2), Math.pow(ph.tint[2], 2.2)); m.needsUpdate = true; });
      window.dispatchEvent(new CustomEvent('lc-loading', { detail: LOADING }));
      const done = setInterval(() => { if (LOADING.done >= LOADING.total) { clearInterval(done); B.rephoto(imgs); dirty(); if (STILL) { updateLOD(); draw(!Q.has('noao')); } window.__texdone = 1; } }, 400);
      if (THREE.RGBELoader) { LOADING.total++; new THREE.RGBELoader().setDataType(THREE.UnsignedByteType).load(base + 'sky.hdr', tx => {
          const d = tx.image.data, w = tx.image.width, h = tx.image.height; let best = 0, bi = 0;
          for (let i = 0; i < w * h; i++) { const e = d[i * 4 + 3]; if (!e) continue; const v = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) * Math.pow(2, e - 136); if (v > best) { best = v; bi = i; } }
          const ph = ((bi % w) / w) * Math.PI * 2; hdrSunAz = Math.atan2(-Math.cos(ph), -Math.sin(ph)); hdrMat.map = tx; hdrMat.needsUpdate = true; hdrReady = true; rebuildEnv(); tick();
        }, undefined, tick); }
    }

    // ---------------------------------------------------------------- resize (compare mode frames the canvas to the rendering's aspect)
    let frameAspect = 0;
    function resize() {
      if (locked) return; let w = innerWidth, h = innerHeight;
      if (frameAspect) { const mw = innerWidth - 48, mh = innerHeight - 170; if (mw / mh > frameAspect) { h = mh; w = h * frameAspect; } else { w = mw; h = w / frameAspect; }
        Object.assign(view.style, { width: w + 'px', height: h + 'px', left: (innerWidth - w) / 2 + 'px', top: Math.max(24, (innerHeight - 120 - h) / 2) + 'px' }); }
      else Object.assign(view.style, { width: '', height: '', left: '', top: '' });
      w = view.clientWidth; h = view.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setPixelRatio(basePR); renderer.setSize(w, h); if (composer) composer.setSize(w, h);
      if (PASS.tiltH && PASS.tiltH.enabled) setTilt(true);
      if (SPLAT.mesh) SPLAT.mesh.material.uniforms.vh.value = h; dirty();
    }
    addEventListener('resize', resize);

    // ---------------------------------------------------------------- picking -> building card
    const ray = new THREE.Raycaster(), m2 = new THREE.Vector2(); let down = null;
    renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; orbit = null; flight = null; if (walk) walk.play = false; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (locked || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
      const r = renderer.domElement.getBoundingClientRect(); m2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(m2, camera); const hit = ray.intersectObjects(B.pick);
      if (!hit.length) { UI.hideInfo(); return; }
      UI.showInfo(hit[0].object.userData);
    });

    // ---------------------------------------------------------------- loop
    let prev = performance.now(); const t0 = prev;
    const STILL = window.CLEAN || Q.has('still');
    function tick(now) {
      if (STILL) { if (!window.__drawn) { window.__drawn = 1; updateLOD(); draw(!Q.has('noao')); } return; }
      requestAnimationFrame(tick); if (locked) return; const dt = Math.min(100, now - prev); prev = now;
      stepFlight(now); stepOrbit(dt); stepWalk(dt); controls.update();
      if (B.anim.length && B.anim.c && camera.position.distanceTo(B.anim.c) < 320) { const t = (now - t0) / 1000; B.anim.forEach(f => f(t)); needs = Math.max(needs, 1); }
      if (SPLAT.mesh && now - SPLAT.sortT > 400 && needs) { SPLAT.sortT = now; sortSplat(); }
      if (needs > 0) { updateLOD(); if (PASS.grade) PASS.grade.uniforms.time.value = (now % 1000) / 1000; draw(false); needs--; }
      else if (!aoDone && (PASS.sao || PASS.bloom) && now - lastMove > 260) { draw(true); aoDone = true; }
    }

    window.AUDIT = B.audit();
    if (Q.has('debug')) { const chip = document.createElement('div'); chip.id = 'dbgbox'; chip.textContent = 'SPATIAL AUDIT · ' + (window.AUDIT.pass ? 'PASS' : 'FAIL') + ' · ' + window.AUDIT.rows.length + ' layers · tier ' + TIER; document.body.appendChild(chip); }

    // ---------------------------------------------------------------- photo mode (progressive multi-sample still) + UI wiring
    const CTX = { $, B, P, T, TIER, TIERS, W, S, flyTo, apply, pose, setSun, SUN, solar, dirty, resize, renderer, camera, controls, scene, sun, pmrem, draw, composer, PASS, SAOP, setTilt, startOrbit,
      stopOrbit: () => { orbit = null; }, walkAt, walkState: () => walk, setWalk: w => { walk = w; }, setFrame: a => { frameAspect = a; resize(); }, splat: SPLAT, loadSplat, loading: LOADING,
      lock: v => { locked = v; if (!v) { resize(); dirty(); } }, basePR: () => basePR };
    CTX.photo = window.LC_PHOTO ? window.LC_PHOTO(CTX) : null;
    const UI = window.LC_UI ? window.LC_UI(CTX) : { showInfo() { }, hideInfo() { } };

    setSun(+(Q.get('doy') || SUN.doy), +(Q.get('hour') || SUN.hour));
    const hash = new URLSearchParams((location.hash || '').slice(1));
    if (hash.get('cam')) { const v = hash.get('cam').split(',').map(Number); if (v.length >= 6) apply({ pos: v.slice(0, 3), tgt: v.slice(3, 6), fov: v[6] || 42 }); if (hash.get('sun')) { const s = hash.get('sun').split(',').map(Number); setSun(s[0], s[1]); } if (UI.enter) UI.enter('explore', true); }
    else { const k = window.VIEW || (location.hash || '').slice(1); if (P[k]) { apply(P[k]); if (UI.enter && !window.CLEAN) UI.enter('explore', true); } else { apply(P.refaerial); if (!window.CLEAN) startOrbit(); } }
    if (window.CLEAN || Q.has('clean')) document.body.classList.add('clean');
    if (SPLAT.url) loadSplat(SPLAT.url).catch(e => { const st = $('splatStatus'); if (st) st.textContent = 'Capture failed to load: ' + e.message; });
    tick(prev);
    if (!STILL || Q.has('tex')) setTimeout(streamTextures, STILL ? 0 : 60);
    window.LC = { renderer, scene, camera, controls, B, P, flyTo, setSun, draw, dirty, PASS, T, TIER, sun, loading: LOADING, photo: CTX.photo, setTilt };
  } catch (e) { const info = $('err'); if (info) { info.style.display = 'block'; info.innerHTML = '<b>Model failed to start</b><br>' + e.message; } console.error(e); }
})();
