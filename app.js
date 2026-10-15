(function () {
  const info = document.getElementById('info');
  try {
    const view = document.getElementById('view');
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.CLEAN ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(view.clientWidth, view.clientHeight);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.70;
    view.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xe6cfa6, 420, 1900);
    const camera = new THREE.PerspectiveCamera(42, view.clientWidth / view.clientHeight, 0.5, 9000);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.497;

    // sky + environment
    const skyC = document.createElement('canvas'); skyC.width = 16; skyC.height = 256; const sg = skyC.getContext('2d');
    const sgr = sg.createLinearGradient(0, 0, 0, 256); sgr.addColorStop(0, '#7fa6c8'); sgr.addColorStop(0.4, '#cfd6d2'); sgr.addColorStop(0.49, '#efd6a8'); sgr.addColorStop(1, '#7c7a62');
    sg.fillStyle = sgr; sg.fillRect(0, 0, 16, 256);
    const skyT = new THREE.CanvasTexture(skyC); skyT.encoding = THREE.sRGBEncoding;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 32, 16), new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide, fog: false, depthWrite: false })); scene.add(sky);
    const eC = document.createElement('canvas'); eC.width = 512; eC.height = 256; const eg = eC.getContext('2d');
    const egr = eg.createLinearGradient(0, 0, 0, 256); egr.addColorStop(0, '#8fb4d6'); egr.addColorStop(0.48, '#e9eef0'); egr.addColorStop(0.52, '#d8cdb6'); egr.addColorStop(1, '#6f6a5e');
    eg.fillStyle = egr; eg.fillRect(0, 0, 512, 256); eg.fillStyle = 'rgba(255,240,210,1)'; eg.beginPath(); eg.arc(300, 82, 22, 0, 6.283); eg.fill();
    const eT = new THREE.CanvasTexture(eC); eT.mapping = THREE.EquirectangularReflectionMapping; eT.encoding = THREE.sRGBEncoding;
    const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(eT).texture;
    scene.add(new THREE.HemisphereLight(0xb8cde0, 0x4e4636, 0.26));

    const env = { canvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } };
    const B = buildCommons(THREE, window.LAYOUT, window.SCENE, env);
    scene.add(B.root);
    const W = B.W, S = B.site;

    // sun: azimuth 215 deg (SW), altitude 30 deg, warm late-afternoon
    const sun = new THREE.DirectionalLight(0xffcf98, 2.45); sun.castShadow = true;
    sun.shadow.mapSize.set(window.CLEAN ? 2048 : 4096, window.CLEAN ? 2048 : 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.4;
    const sc = sun.shadow.camera; sc.left = -380; sc.right = 380; sc.top = 300; sc.bottom = -300; sc.near = 10; sc.far = 3000;
    const az = 215 * Math.PI / 180, al = 30 * Math.PI / 180, R = 1400;
    const tgt = W(S.cx, S.cy, 0); sun.target.position.copy(tgt);
    sun.position.copy(W(S.cx + R * Math.sin(az) * Math.cos(al), S.cy + R * Math.cos(az) * Math.cos(al), R * Math.sin(al)));
    scene.add(sun); scene.add(sun.target);

    // spatial audit gate -> chip
    const A = B.audit();
    const chip = document.createElement('div'); chip.id = 'dbgbox';
    chip.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:99;background:rgba(10,14,18,0.82);color:' + (A.pass ? '#9fe08a' : '#ff8a7a') + ';font:11px/1.45 monospace;padding:7px 11px;border-radius:6px;pointer-events:none;max-width:360px';
    chip.textContent = 'SPATIAL AUDIT · ROADS OSM-LANES r5 · ' + (A.pass ? 'PASS' : 'FAIL') + ' · ' + A.rows.length + ' layers · ' + A.rows.reduce((s, r) => s + r.n, 0) + ' objects · north = -Z';
    if (!A.pass) chip.textContent += ' · ' + A.rows.filter(r => !r.pass).map(r => r.layer + ' out ' + r.out).join(', ');
    document.body.appendChild(chip); window.AUDIT = A;

    // presets
    function go(k) { const p = B.presets[k]; if (!p) return; camera.position.copy(W(p.pos[0], p.pos[1], p.pos[2])); controls.target.copy(W(p.tgt[0], p.tgt[1], p.tgt[2])); camera.near = p.pos[2] < 30 ? 0.3 : 1; camera.fov = p.fov || 42; camera.updateProjectionMatrix(); controls.update(); }
    window.GO = go;
    document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => go(b.dataset.view));
    const presentationBtn = document.getElementById('presentationBtn');
    const hud = document.getElementById('hud');
    let presentation = false;
    if (presentationBtn) presentationBtn.onclick = () => {
      presentation = !presentation;
      if (presentation) {
        document.body.appendChild(presentationBtn);
        presentationBtn.className = 'presentation-exit';
      } else {
        hud.appendChild(presentationBtn);
        presentationBtn.className = '';
      }
      ['hud', 'legend', 'compass', 'dbgbox'].forEach(id => { const el = document.getElementById(id); if (el) el.style.display = presentation ? 'none' : ''; });
      presentationBtn.style.display = 'block';
      presentationBtn.textContent = presentation ? 'Exit presentation' : 'Presentation mode';
      document.body.classList.toggle('presentation', presentation);
    };
    const q = window.VIEW || (location.hash || '').replace('#', ''); go(B.presets[q] ? q : 'hero');

    // layers
    [['chkctx', 'ctx'], ['chkstreets', 'streets'], ['chkrails', 'rails'], ['chklabels', 'labels'], ['chkpeople', 'people'], ['chkroof', 'roofpark'], ['chkvault', 'vault']].forEach(([id, g]) => {
      const el = document.getElementById(id); if (!el) return; B.groups[g].visible = el.checked; el.onchange = () => { B.groups[g].visible = el.checked; };
    });
    if (window.CLEAN || /nolabels/.test(location.search)) B.groups.labels.visible = false;

    // stats
    const st = window.LAYOUT.stats, f = n => n.toLocaleString('en-US');
    document.getElementById('stats').innerHTML = '<table>' + [
      ['Site', '<b>' + st.site_ac + ' ac</b> · ' + f(st.site_m2) + ' m²'],
      ['Retained civic core', f(st.core_gla_sf) + ' SF (3 levels)'],
      ['Glass galleria', st.vault_len + ' m · venue (W) → towers (E)'],
      ['Crossing pavilion', st.pav_d + ' m · chamfered hall / longitudinal ridge'],
      ['Roof Commons Park', '<b>' + f(st.park_m2) + ' m²</b> on podium roofs'],
      ['Total GFA', f(st.total_gfa_m2) + ' m² · FAR <b>' + st.far + '</b>'],
      ['Homes (85 m² avg)', '<b>≈ ' + f(st.units) + '</b>'],
      ['Office', f(st.office_m2) + ' m²'],
      ['Ground open space', st.ground_open_pct + '%'],
      ['Tallest', st.max_fl + ' floors (Axis Terminus Tower)'],
      ['Trees · people', f(st.trees) + ' · ' + f(st.people)],
    ].map(r => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table>';

    // picking
    const ray = new THREE.Raycaster(), m2 = new THREE.Vector2(); let down = null;
    renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
    renderer.domElement.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
      const r = renderer.domElement.getBoundingClientRect(); m2.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(m2, camera); const h = ray.intersectObjects(B.pick);
      if (!h.length) { info.style.display = 'none'; return; }
      const b = h[0].object.userData;
      info.innerHTML = '<b>' + b.name + '</b><br>' + b.fl + ' floors · ' + b.h.toFixed(1) + ' m<br>program: ' + Math.round(b.prog.resi * 100) + '% resi / ' + Math.round(b.prog.off * 100) + '% office / ' + Math.round(b.prog.ret * 100) + '% retail' + (b.units ? '<br>≈ ' + f(b.units) + ' homes' : '');
      info.style.display = 'block';
    });
    window.addEventListener('resize', () => { camera.aspect = view.clientWidth / view.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(view.clientWidth, view.clientHeight); });

    const note = document.getElementById('scaleNote');
    if (window.VIEW === 'autumn') { scene.fog.color.set(0xd9c39d); scene.fog.near = 300; scene.fog.far = 1500; renderer.toneMappingExposure = 0.82; }
    if (window.VIEW === 'masterplan') { scene.fog.near = 900; scene.fog.far = 5000; renderer.toneMappingExposure = 0.9; }
    (function tick() { if (window.CLEAN) { renderer.render(scene, camera); return; } requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); if (note) note.textContent = 'view width ≈ ' + f(Math.round(2 * camera.position.distanceTo(controls.target) * Math.tan(camera.fov * Math.PI / 360))) + ' m'; })();
    if (window.CLEAN || /clean/.test(location.search)) { ['hud', 'legend', 'compass'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; }); }
  } catch (e) { info.style.display = 'block'; info.innerHTML = '<b>APP ERROR</b><br>' + e.message + '<br>' + ((e.stack || '').split('\n')[1] || ''); }
})();
