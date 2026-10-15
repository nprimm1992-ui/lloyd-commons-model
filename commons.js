// Lloyd Commons superblock — scene builder (renderer-free; runs in browser or Node).
// ONE coordinate convention: site (x=east, y=north, h=up)  ->  world (X=x, Y=h, Z=-y).  North = -Z.
function buildCommons(THREE, LY, SC, env) {
  'use strict';
  const W = (x, y, h) => new THREE.Vector3(x, h || 0, -y);
  let seed = 7;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const root = new THREE.Group();
  const G = {};
  ['ground', 'streets', 'rails', 'core', 'vault', 'roofpark', 'venue', 'plaza', 'buildings', 'detail', 'trees', 'people', 'ctx', 'labels']
    .forEach(k => { G[k] = new THREE.Group(); G[k].name = k; root.add(G[k]); });
  const pick = [];
  const C = LY.core, POD = C.POD_H, AX = C.AX, RX = C.RX;

  // ------------------------------------------------------------ textures
  function tex(w, h, draw, rx, ry, color) {
    const c = env.canvas(w, h), t = c.getContext('2d'); draw(t, w, h);
    const tx = new THREE.CanvasTexture(c); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 8;
    if (rx) tx.repeat.set(rx, ry);
    if (color !== false) tx.encoding = THREE.sRGBEncoding;
    return tx;
  }
  const hex = (r, g, b) => 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  function jitter(rgb, a) { const s = (rnd() - 0.5) * a; return hex(rgb[0] + s, rgb[1] + s * 0.9, rgb[2] + s * 0.8); }
  // facade tile = 2 bays x 2 floors (6.6 m x 6.6 m)
  function facade(o) {
    return (t, w, h) => {
      t.fillStyle = hex(...o.wall); t.fillRect(0, 0, w, h);
      if (o.brick) { const ch = 6; for (let y = 0; y < h; y += ch) for (let x = -(y / ch % 2) * 9; x < w; x += 18) { t.fillStyle = jitter(o.wall, 26); t.fillRect(x + 0.6, y + 0.6, 17, ch - 1.2); } }
      else { for (let i = 0; i < 260; i++) { t.fillStyle = 'rgba(0,0,0,' + (rnd() * 0.05) + ')'; t.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 20, 2 + rnd() * 6); } }
      const bw = w / 2, fh = h / 2;
      if (o.piers !== false) { for (let i = 0; i <= 2; i++) { t.fillStyle = 'rgba(0,0,0,0.22)'; t.fillRect(i * bw - 7, 0, 14, h); t.fillStyle = 'rgba(255,255,255,0.08)'; t.fillRect(i * bw - 7, 0, 3, h); } }
      for (let j = 0; j < 2; j++) {
        t.fillStyle = o.band; t.fillRect(0, j * fh + fh - fh * 0.07, w, fh * 0.07);
        for (let i = 0; i < 2; i++) {
          const wx = i * bw + bw * o.wx, wy = j * fh + fh * o.wy, ww = bw * o.ww, wh = fh * o.wh;
          t.fillStyle = o.frame; t.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
          const lit = rnd() < 0.09, g = t.createLinearGradient(wx, wy, wx + ww * 0.6, wy + wh);
          if (lit) { g.addColorStop(0, '#f6dcae'); g.addColorStop(1, '#c79a62'); }
          else { g.addColorStop(0, '#8fa6b4'); g.addColorStop(0.45, '#4a5c6a'); g.addColorStop(1, '#232c36'); }
          t.fillStyle = g; t.fillRect(wx, wy, ww, wh);
          if (rnd() < 0.18) { t.fillStyle = 'rgba(214,206,190,0.6)'; t.fillRect(wx, wy, ww, wh * (0.2 + rnd() * 0.4)); }
          t.fillStyle = 'rgba(255,255,255,0.18)'; t.beginPath(); t.moveTo(wx, wy + wh); t.lineTo(wx + ww * 0.5, wy); t.lineTo(wx + ww * 0.68, wy); t.lineTo(wx + ww * 0.18, wy + wh); t.fill();
          t.fillStyle = o.frame; t.fillRect(wx + ww / 2 - 2, wy, 4, wh); if (o.transom) t.fillRect(wx, wy + wh * 0.28, ww, 3);
          t.fillStyle = o.sill; t.fillRect(wx - 6, wy + wh + 3, ww + 12, 6);
        }
      }
    };
  }
  function curtain(base) {
    return (t, w, h) => {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) {
        const g = t.createLinearGradient(0, j * h / 2, 0, j * h / 2 + h / 2), k = rnd() * 30;
        g.addColorStop(0, hex(base[0] + 60 + k, base[1] + 70 + k, base[2] + 70 + k)); g.addColorStop(0.55, hex(...base)); g.addColorStop(1, hex(base[0] - 20, base[1] - 18, base[2] - 12));
        t.fillStyle = g; t.fillRect(i * w / 4, j * h / 2, w / 4, h / 2);
        if (rnd() < 0.1) { t.fillStyle = 'rgba(250,220,170,0.55)'; t.fillRect(i * w / 4 + 4, j * h / 2 + 20, w / 4 - 8, h / 2 - 40); }
      }
      t.fillStyle = 'rgba(205,212,216,0.95)';
      for (let i = 0; i <= 8; i++) t.fillRect(i * w / 8 - 1.5, 0, 3, h);
      for (let j = 0; j < 2; j++) { t.fillStyle = 'rgba(60,70,78,0.95)'; t.fillRect(0, j * h / 2 + h / 2 - 22, w, 22); t.fillStyle = 'rgba(210,216,220,0.9)'; t.fillRect(0, j * h / 2 + h / 2 - 24, w, 3); }
    };
  }
  function storefront(t, w, h) {
    t.fillStyle = '#2a2622'; t.fillRect(0, 0, w, h);
    for (let i = 0; i < 2; i++) {
      const x0 = i * w / 2 + 8, x1 = (i + 1) * w / 2 - 8;
      const g = t.createLinearGradient(0, h * 0.25, 0, h);
      const warm = rnd() < 0.7; g.addColorStop(0, warm ? '#fbe2b4' : '#dbe6ea'); g.addColorStop(1, warm ? '#b88a58' : '#7d9098');
      t.fillStyle = g; t.fillRect(x0, h * 0.24, x1 - x0, h * 0.74);
      t.fillStyle = 'rgba(40,36,30,0.45)'; for (let k = 0; k < 4; k++) t.fillRect(x0 + rnd() * (x1 - x0 - 40), h * 0.6 + rnd() * h * 0.25, 30 + rnd() * 30, h * 0.4);
      t.fillStyle = '#1d1a17'; t.fillRect(x0 + (x1 - x0) / 2 - 3, h * 0.24, 6, h * 0.74);
      t.fillStyle = ['#c2512f', '#2f5d50', '#d6b25a', '#3d4a66', '#8a3b36'][(rnd() * 5) | 0]; t.fillRect(x0, h * 0.12, x1 - x0, h * 0.09);
    }
    t.fillStyle = '#d9d2c4'; t.fillRect(0, 0, w, h * 0.1);
  }
  function podiumTex(t, w, h) {
    storefront(t, w, h); t.fillStyle = '#f3f1ec'; t.fillRect(0, 0, w, h * 0.17); t.fillStyle = 'rgba(160,200,210,0.6)'; t.fillRect(0, h * 0.17, w, h * 0.04);
  }
  function timberTex(t, w, h) {
    for (let x = 0; x < w; x += 8) { t.fillStyle = jitter([196, 150, 102], 40); t.fillRect(x, 0, 6, h); t.fillStyle = 'rgba(60,40,24,0.55)'; t.fillRect(x + 6, 0, 2, h); }
  }
  function charcoalTex(t, w, h) {
    t.fillStyle = '#3d4248'; t.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) { t.fillStyle = 'rgba(255,255,255,0.05)'; t.fillRect(0, y, w, 2); }
    for (let j = 0; j < 2; j++) { const g = t.createLinearGradient(0, j * h / 2 + 30, 0, j * h / 2 + h / 2 - 50); g.addColorStop(0, '#9fb3c0'); g.addColorStop(1, '#2d3742'); t.fillStyle = g; t.fillRect(0, j * h / 2 + 40, w, h / 2 - 100); t.fillStyle = '#2a2e33'; for (let i = 0; i <= 8; i++) t.fillRect(i * w / 8 - 2, j * h / 2 + 40, 4, h / 2 - 100); }
  }
  function paver(t, w, h) { t.fillStyle = '#b5ad9c'; t.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) { const o = (r % 2) * w / 8; t.fillStyle = jitter([214, 206, 190], 18); t.fillRect(c * w / 4 + o + 1.5, r * h / 8 + 1.5, w / 4 - 3, h / 8 - 3); } }
  function stone(t, w, h) { t.fillStyle = '#d8d3c8'; t.fillRect(0, 0, w, h); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { t.fillStyle = jitter([236, 232, 222], 10); t.fillRect(c * w / 4 + 1, r * h / 4 + 1, w / 4 - 2, h / 4 - 2); } }
  function meadow(t, w, h) {
    t.fillStyle = '#6f8b46'; t.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { t.fillStyle = ['#86a35a', '#5d7a3c', '#9db46a', '#4f6a34', '#b3a35c', '#c9b46a', '#7f9a50'][i % 7]; t.globalAlpha = 0.45 + rnd() * 0.5; t.beginPath(); t.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 22, 4 + rnd() * 12, rnd() * 3, 0, 6.283); t.fill(); }
    t.globalAlpha = 1; for (let j = 0; j < 500; j++) { t.fillStyle = ['rgba(240,220,120,0.8)', 'rgba(230,150,170,0.7)', 'rgba(250,250,240,0.8)', 'rgba(50,70,35,0.6)'][j % 4]; t.fillRect(rnd() * w, rnd() * h, 2, 2); }
  }
  function lawn(t, w, h) { t.fillStyle = '#7c9a52'; t.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { t.fillStyle = 'rgba(' + (90 + rnd() * 40 | 0) + ',' + (120 + rnd() * 40 | 0) + ',60,0.35)'; t.beginPath(); t.ellipse(rnd() * w, rnd() * h, 10 + rnd() * 30, 8 + rnd() * 20, rnd() * 3, 0, 6.283); t.fill(); } }
  function asphalt(t, w, h) {
    t.fillStyle = '#4a4e53'; t.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const v = 60 + rnd() * 50; t.fillStyle = 'rgba(' + (v | 0) + ',' + (v + 3 | 0) + ',' + (v + 6 | 0) + ',0.5)'; t.fillRect(rnd() * w, rnd() * h, 2, 2); }
    t.fillStyle = '#d7c26c'; t.fillRect(w / 2 - 5, 0, 3, h); t.fillRect(w / 2 + 2, 0, 3, h);
    t.fillStyle = 'rgba(232,232,226,0.85)'; t.fillRect(5, 0, 3, h); t.fillRect(w - 8, 0, 3, h);
    t.fillStyle = 'rgba(232,232,226,0.7)'; t.fillRect(w * 0.25, 0, 2, h * 0.45); t.fillRect(w * 0.75 - 2, 0, 2, h * 0.45);
  }
  function concrete(t, w, h) { t.fillStyle = '#cfcbc1'; t.fillRect(0, 0, w, h); t.fillStyle = 'rgba(120,115,105,0.45)'; for (let y = 0; y < h; y += h / 4) t.fillRect(0, y, w, 1.5); }
  function pvTex(t, w, h) { t.fillStyle = '#1b2533'; t.fillRect(0, 0, w, h); t.strokeStyle = '#8796a6'; t.lineWidth = 2; for (let i = 0; i <= 6; i++) { t.beginPath(); t.moveTo(i * w / 6, 0); t.lineTo(i * w / 6, h); t.stroke(); } for (let j = 0; j <= 3; j++) { t.beginPath(); t.moveTo(0, j * h / 3); t.lineTo(w, j * h / 3); t.stroke(); } const g = t.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(200,225,245,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); t.fillStyle = g; t.fillRect(0, 0, w, h); }
  function mullion(nu, nv, pane) {
    return (t, w, h) => { t.fillStyle = pane; t.fillRect(0, 0, w, h); t.fillStyle = '#ffffff'; for (let i = 0; i <= nu; i++) t.fillRect(i * w / nu - 3, 0, 6, h); for (let j = 0; j <= nv; j++) t.fillRect(0, j * h / nv - 3, w, 6); };
  }
  function plazaTex(t, w, h) {
    const c = w / 2; t.fillStyle = '#d6d2ca'; t.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { t.fillStyle = 'rgba(' + (150 + rnd() * 40 | 0) + ',' + (146 + rnd() * 40 | 0) + ',' + (140 + rnd() * 40 | 0) + ',0.35)'; t.fillRect(rnd() * w, rnd() * h, 6 + rnd() * 14, 4 + rnd() * 8); }
    if (false) for (let k = 0; k < 48; k++) { const a = k / 48 * 6.283; t.beginPath(); t.moveTo(c + Math.cos(a) * c * 0.35, c + Math.sin(a) * c * 0.35); t.lineTo(c + Math.cos(a) * c, c + Math.sin(a) * c); t.stroke(); }
    
  }

  const std = o => new THREE.MeshStandardMaterial(o);
  const FT = 6.6;
  const brickMat = (rgb, band) => std({ map: tex(512, 512, facade({ wall: rgb, brick: true, band: band, frame: '#2b2724', sill: '#d9d2c2', wx: 0.2, wy: 0.16, ww: 0.6, wh: 0.62, transom: true })), roughness: 0.9, envMapIntensity: 0.5 });
  const M = {
    brickRed: brickMat([150, 74, 56], '#7e5a4a'), brickOrange: brickMat([184, 104, 66], '#8c6a52'), brickBrown: brickMat([118, 78, 60], '#6a5446'),
    buff: std({ map: tex(512, 512, facade({ wall: [178, 146, 116], band: '#9a7a5c', frame: '#2a2826', sill: '#cdbba2', wx: 0.14, wy: 0.12, ww: 0.72, wh: 0.7 })), roughness: 0.85, envMapIntensity: 0.5 }),
    tower: std({ map: tex(512, 512, facade({ wall: [156, 142, 126], band: '#867868', frame: '#2c3034', sill: '#c9bfae', wx: 0.1, wy: 0.1, ww: 0.8, wh: 0.74 })), roughness: 0.6, envMapIntensity: 0.7 }),
    curtain: std({ map: tex(512, 512, curtain([70, 96, 116])), roughness: 0.18, metalness: 0.55, envMapIntensity: 1.2 }),
    charcoal: std({ map: tex(512, 512, charcoalTex), roughness: 0.55, metalness: 0.3, envMapIntensity: 0.8 }),
    timber: std({ map: tex(256, 256, timberTex), roughness: 0.72 }),
    shop: std({ map: tex(512, 512, storefront), roughness: 0.45, emissive: 0x3a2610, emissiveIntensity: 0.35, envMapIntensity: 0.6 }),
    podium: std({ map: tex(512, 512, podiumTex), roughness: 0.45, emissive: 0x3a2610, emissiveIntensity: 0.3, envMapIntensity: 0.6 }),
    coping: std({ color: 0xe9e5dc, roughness: 0.8 }), roofGray: std({ color: 0x8f8a80, roughness: 0.95 }),
    meadow: std({ map: tex(256, 256, meadow), roughness: 0.97 }), lawn: std({ map: tex(256, 256, lawn), roughness: 0.97 }),
    paver: std({ map: tex(256, 256, paver), roughness: 0.92 }), stone: std({ map: tex(256, 256, stone), roughness: 0.35, envMapIntensity: 0.6 }),
    asphalt: std({ color:0x55585b, roughness: 0.95 }), walk: std({ map: tex(128, 128, concrete), roughness: 0.95 }),
    pv: std({ map: tex(128, 64, pvTex), roughness: 0.25, metalness: 0.6, envMapIntensity: 1.1 }),
    plaza: std({ map: tex(1024, 1024, plazaTex), roughness: 0.9 }),
    glass: std({ color: 0x3e5a68, opacity: 0.95, transparent: true, alphaMap: tex(256, 256, mullion(1, 3, '#e6e6e6'), 0, 0, false), roughness: 0.1, metalness: 0.72, envMapIntensity: 1.35, side: THREE.DoubleSide, depthWrite: false }),
    glassRail: std({ color: 0xd4ecf2, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.4, side: THREE.DoubleSide, depthWrite: false }),
    glassBox: std({ color: 0x9ec0cc, roughness: 0.1, metalness: 0.65, envMapIntensity: 1.4, emissive: 0x6a4a22, emissiveIntensity: 0.45 }),
    white: std({ color: 0xf4f2ec, roughness: 0.55 }), wood: std({ color: 0xb98a58, roughness: 0.65 }), glulam: std({ color: 0xcf9e64, roughness: 0.6 }),
    dark: std({ color: 0x33373c, roughness: 0.7 }), metal: std({ color: 0x8b9095, roughness: 0.4, metalness: 0.7 }),
    ice: std({ color: 0xeef6fa, roughness: 0.12, metalness: 0.05, envMapIntensity: 1.2 }), water: std({ color: 0x3f8fb4, roughness: 0.04, metalness: 0.4, envMapIntensity: 1.6, transparent: true, opacity: 0.92 }),
    jet: std({ color: 0xffffff, transparent: true, opacity: 0.85, emissive: 0xbfe6ff, emissiveIntensity: 0.4, depthWrite: false }),
    glow: std({ color: 0xffe2a8, emissive: 0xffb552, emissiveIntensity: 1.6 }), soil: std({ color: 0x5a4632, roughness: 1 }),
    ctx: std({ color: 0x8c857b, roughness: 0.95 }), ground: std({ color: 0x5f6551, roughness: 1 }), site: std({ color: 0xcfc9bb, roughness: 1 }),
    tint: std({ color: 0xffffff, roughness: 0.92 }), cloth: std({ color: 0xffffff, roughness: 0.85 }),
    rail: std({ color: 0x6a645c, roughness: 0.9 }), track: std({ color: 0x9a9da0, roughness: 0.3, metalness: 0.8 }),
  };
  M.terracotta = std({ map: tex(512, 512, facade({ wall: [176, 98, 70], band: '#8e5a44', frame: '#2a2522', sill: '#cdb9a2', wx: 0.12, wy: 0.12, ww: 0.76, wh: 0.72, transom: true })), roughness: 0.7, envMapIntensity: 0.6 });
  M.darkglass = std({ map: tex(512, 512, curtain([58, 66, 72])), roughness: 0.2, metalness: 0.5, envMapIntensity: 1.25 });
  M.stoneF = std({ map: tex(512, 512, facade({ wall: [168, 150, 130], band: '#8e7c68', frame: '#2b2724', sill: '#cbbca8', wx: 0.18, wy: 0.14, ww: 0.64, wh: 0.66, transom: true })), roughness: 0.8, envMapIntensity: 0.5 });
  M.copper = std({ map: tex(256, 256, (t, w, h) => { t.fillStyle = '#5a3416'; t.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) { t.fillStyle = jitter([196, 124, 58], 30); t.fillRect(x, 0, 6, h); t.fillStyle = 'rgba(255,214,150,0.18)'; t.fillRect(x, 0, 1.5, h); } t.fillStyle = 'rgba(30,18,10,0.85)'; t.fillRect(0, 0, w, 5); t.fillRect(0, h - 5, w, 5); }), roughness: 0.72, metalness: 0.0, envMapIntensity: 0.45 });
  M.darkPanel = std({ map: tex(256, 256, (t, w, h) => { t.fillStyle = '#26292d'; t.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { t.fillStyle = 'rgba(255,255,255,0.06)'; t.fillRect(0, y, w, 2); } for (let x = 0; x < w; x += 64) { t.fillStyle = 'rgba(0,0,0,0.25)'; t.fillRect(x, 0, 2, h); } }), roughness: 0.6, metalness: 0.2 });
  M.venueBase = std({ map: tex(512, 256, (t, w, h) => { t.fillStyle = '#2d3135'; t.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { const g = t.createLinearGradient(0, h * 0.25, 0, h); g.addColorStop(0, '#f7d9a4'); g.addColorStop(1, '#a8743e'); t.fillStyle = g; t.fillRect(i * w / 6 + 8, h * 0.28, w / 6 - 16, h * 0.68); t.fillStyle = '#22262a'; t.fillRect(i * w / 6 + w / 12 - 2, h * 0.28, 4, h * 0.68); } t.fillStyle = '#3b4046'; t.fillRect(0, 0, w, h * 0.2); }), roughness: 0.5, emissive: 0x3a2610, emissiveIntensity: 0.4 });
  M.greenhouse = std({ color: 0xdfeee8, transparent: true, opacity: 0.35, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false });
  M.pavRoof = std({ color: 0x4f7896, roughness: 0.06, metalness: 0.8, envMapIntensity: 1.9, transparent: true, opacity: 0.9, side: THREE.DoubleSide, alphaMap: tex(256, 256, mullion(6, 4, '#c8c8c8'), 0, 0, false) });
  M.glassEnd = std({ color: 0x9fb8c4, transparent: true, opacity: 0.55, roughness: 0.06, metalness: 0.6, envMapIntensity: 1.5, side: THREE.DoubleSide, depthWrite: false });
  M.ribSteel = std({ color: 0xdfe3e2, roughness: 0.35, metalness: 0.6 });
  M.hallGlass = std({ map: tex(512, 256, (t, w, h) => { const g = t.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d9b98a'); g.addColorStop(0.5, '#f4d7a2'); g.addColorStop(1, '#a87c4c'); t.fillStyle = g; t.fillRect(0, 0, w, h); t.fillStyle = 'rgba(60,40,24,0.35)'; for (let i = 0; i < 18; i++) t.fillRect(rnd() * w, h * 0.55 + rnd() * h * 0.3, 10 + rnd() * 20, h * 0.4); t.fillStyle = '#e8e6e0'; t.fillRect(0, h * 0.3, w, 5); }), roughness: 0.15, metalness: 0.3, emissive: 0x6a4420, emissiveIntensity: 0.55, envMapIntensity: 1.1 });
  M.hallRoof = std({ map: tex(256, 256, (t, w, h) => { t.fillStyle = '#c8ad84'; t.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 10) { t.fillStyle = 'rgba(120,128,130,0.35)'; t.fillRect(x, 0, 1.5, h); t.fillStyle = 'rgba(255,255,255,0.35)'; t.fillRect(x + 2, 0, 1, h); } }), roughness: 0.38, metalness: 0.55, envMapIntensity: 1.2, side: THREE.DoubleSide });
  M.brickPave = std({ color: 0x9a5a44, roughness: 0.9 });
  M.membrane = std({ color: 0xe6e4de, roughness: 0.85 });
  M.hallClere = std({ map: tex(512, 512, (t, w, h) => { const g = t.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfd9dc'); g.addColorStop(0.45, '#e9d3a8'); g.addColorStop(1, '#c79a62'); t.fillStyle = g; t.fillRect(0, 0, w, h); t.fillStyle = 'rgba(255,240,210,0.35)'; for (let i = 0; i < 30; i++) t.fillRect(rnd() * w, h * 0.5 + rnd() * h * 0.45, 6 + rnd() * 14, 4); }), transparent: true, opacity: 0.45, roughness: 0.16, metalness: 0.4, envMapIntensity: 1.2, emissive: 0x6a4420, emissiveIntensity: 0.55, side: THREE.DoubleSide, depthWrite: false });
  M.tent = std({ color: 0xf4f0e6, roughness: 0.85, side: THREE.DoubleSide });
  // Reference north-row facades (ref_04 left half): bronze-finned dark glass, deep red-brown brick with recessed bays,
  // light precast with punched windows, warm sand terracotta. Floor-to-floor 3.3 m -> 2 floors per 6.6 m tile.
  function finGlass(t, w, h) { const g0 = t.createLinearGradient(0, 0, 0, h); g0.addColorStop(0, '#5b6670'); g0.addColorStop(1, '#2e353b'); t.fillStyle = g0; t.fillRect(0, 0, w, h);
    for (let j = 0; j < 2; j++) { const y = j * h / 2; t.fillStyle = 'rgba(160,190,205,0.18)'; t.fillRect(0, y + h * 0.06, w, h * 0.16); if (rnd() < 0.18) { t.fillStyle = 'rgba(246,214,160,0.42)'; t.fillRect(rnd() * w * 0.7, y + h * 0.12, w * 0.3, h * 0.3); } t.fillStyle = '#2a2420'; t.fillRect(0, y + h / 2 - 10, w, 10); }
    for (let x = 0; x < w; x += w / 8) { t.fillStyle = '#9a6a3c'; t.fillRect(x, 0, 9, h); t.fillStyle = 'rgba(255,220,170,0.35)'; t.fillRect(x, 0, 2, h); t.fillStyle = 'rgba(0,0,0,0.35)'; t.fillRect(x + 9, 0, 4, h); } }
  function precast(t, w, h) { t.fillStyle = '#d3cbbd'; t.fillRect(0, 0, w, h); for (let i = 0; i < 200; i++) { t.fillStyle = 'rgba(0,0,0,' + rnd() * 0.04 + ')'; t.fillRect(rnd() * w, rnd() * h, 10 + rnd() * 30, 3 + rnd() * 6); }
    for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) { const x = i * w / 4 + w * 0.05, y = j * h / 2 + h * 0.09, ww = w / 4 * 0.78, hh = h / 2 * 0.62;
      t.fillStyle = '#3a3c3e'; t.fillRect(x - 3, y - 3, ww + 6, hh + 6); const g = t.createLinearGradient(x, y, x + ww, y + hh); const lit = rnd() < 0.1; g.addColorStop(0, lit ? '#f4d8a8' : '#92a9b6'); g.addColorStop(1, lit ? '#c4935c' : '#2b343c'); t.fillStyle = g; t.fillRect(x, y, ww, hh); t.fillStyle = '#3a3c3e'; t.fillRect(x + ww / 2 - 1.5, y, 3, hh); }
    for (let j = 1; j <= 2; j++) { t.fillStyle = 'rgba(120,112,100,0.55)'; t.fillRect(0, j * h / 2 - 4, w, 4); } }
  M.refBronze = std({ map: tex(512, 512, finGlass), roughness: 0.28, metalness: 0.45, envMapIntensity: 1.1 });
  M.refBrick = std({ map: tex(512, 512, facade({ wall: [112, 62, 46], brick: true, band: '#5a3a2e', frame: '#1f1c1a', sill: '#b9a690', wx: 0.12, wy: 0.12, ww: 0.76, wh: 0.7, transom: true })), roughness: 0.88, envMapIntensity: 0.45 });
  M.refPrecast = std({ map: tex(512, 512, precast), roughness: 0.8, envMapIntensity: 0.55 });
  M.refSand = std({ map: tex(512, 512, facade({ wall: [190, 150, 112], band: '#a07a58', frame: '#2a2622', sill: '#d9c7ad', wx: 0.12, wy: 0.12, ww: 0.76, wh: 0.68 })), roughness: 0.8, envMapIntensity: 0.5 });
  const FMAT = { terracotta: M.terracotta, darkglass: M.darkglass, stone: M.stoneF, brickRed: M.brickRed, brickOrange: M.brickOrange, brickBrown: M.brickBrown, buff: M.buff, tower: M.tower, curtain: M.curtain, charcoal: M.charcoal, timber: M.timber, refBronze: M.refBronze, refBrick: M.refBrick, refPrecast: M.refPrecast, refSand: M.refSand };

  // ------------------------------------------------------------ geometry kit (all through W)
  function ccw(fp) { let a = 0; for (let i = 0; i < fp.length; i++) { const p = fp[i], q = fp[(i + 1) % fp.length]; a += p[0] * q[1] - q[0] * p[1]; } return a >= 0 ? fp : fp.slice().reverse(); }
  function Geo() { this.p = []; this.u = []; this.g = []; }
  Geo.prototype.tri = function (a, b, c, ua, ub, uc, want) { // want: desired normal Vector3 (optional)
    if (want) { const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)); if (n.dot(want) < 0) { const t = b; b = c; c = t; const tu = ub; ub = uc; uc = tu; } }
    this.p.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); this.u.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  };
  Geo.prototype.mark = function () { return this.p.length / 3; };
  Geo.prototype.group = function (s, mi) { this.g.push([s, this.mark() - s, mi]); };
  Geo.prototype.build = function () { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2)); this.g.forEach(x => g.addGroup(x[0], x[1], x[2])); g.computeVertexNormals(); return g; };
  function walls(geo, fp, z0, z1, tu, tv, voff, inward) {
    fp = ccw(fp); let d = 0; const n = fp.length;
    for (let i = 0; i < n; i++) {
      const a = fp[i], b = fp[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 0.05) continue;
      const out = new THREE.Vector3(b[1] - a[1], 0, b[0] - a[0]).multiplyScalar(inward ? -1 : 1);
      const u0 = d / tu, u1 = (d + L) / tu, v0 = (z0 - voff) / tv, v1 = (z1 - voff) / tv; d += L;
      const A0 = W(a[0], a[1], z0), B0 = W(b[0], b[1], z0), B1 = W(b[0], b[1], z1), A1 = W(a[0], a[1], z1);
      geo.tri(A0, B0, B1, [u0, v0], [u1, v0], [u1, v1], out); geo.tri(A0, B1, A1, [u0, v0], [u1, v1], [u0, v1], out);
    }
  }
  function cap(geo, fp, z, tu, holes, down) {
    fp = ccw(fp); const hs = (holes || []).map(h => ccw(h).slice().reverse());
    const pts = fp.concat(...hs);
    const tris = THREE.ShapeUtils.triangulateShape(fp.map(p => new THREE.Vector2(p[0], p[1])), hs.map(h => h.map(p => new THREE.Vector2(p[0], p[1]))));
    const want = new THREE.Vector3(0, down ? -1 : 1, 0);
    tris.forEach(t => { const P = t.map(i => pts[i]); geo.tri(W(P[0][0], P[0][1], z), W(P[1][0], P[1][1], z), W(P[2][0], P[2][1], z), [P[0][0] / tu, P[0][1] / tu], [P[1][0] / tu, P[1][1] / tu], [P[2][0] / tu, P[2][1] / tu], want); });
  }
  function mesh(geo, mat, grp, shadow) { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow !== false; m.receiveShadow = true; grp.add(m); return m; }
  function flat(fp, z, mat, grp, tu, holes) { const g = new Geo(); cap(g, fp, z, tu || 4, holes); return mesh(g.build(), mat, grp, false); }
  function prism(fp, z0, z1, wallMat, roofMat, grp, tu, tv, voff) { const g = new Geo(); let s = g.mark(); walls(g, fp, z0, z1, tu || 4, tv || 4, voff || 0); g.group(s, 0); s = g.mark(); cap(g, fp, z1, 4); g.group(s, 1); return mesh(g.build(), [wallMat, roofMat || wallMat], grp); }
  function strip(pts, w, vlen, z) { // ribbon along polyline, miter-joined
    const g = new Geo(), n = pts.length, L = [], R = []; let dist = [0];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      let nx = -dy, ny = dx, sc = 1;
      if (i > 0 && i < n - 1) { const d1x = p[0] - a[0], d1y = p[1] - a[1], l1 = Math.hypot(d1x, d1y) || 1; const m = Math.max(0.35, (-d1y / l1) * nx + (d1x / l1) * ny); sc = 1 / m; }
      L.push([p[0] + nx * w / 2 * sc, p[1] + ny * w / 2 * sc]); R.push([p[0] - nx * w / 2 * sc, p[1] - ny * w / 2 * sc]);
      if (i > 0) dist.push(dist[i - 1] + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]));
    }
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < n - 1; i++) {
      const v0 = dist[i] / vlen, v1 = dist[i + 1] / vlen;
      g.tri(W(R[i][0], R[i][1], z), W(L[i][0], L[i][1], z), W(L[i + 1][0], L[i + 1][1], z), [1, v0], [0, v0], [0, v1], up);
      g.tri(W(R[i][0], R[i][1], z), W(L[i + 1][0], L[i + 1][1], z), W(R[i + 1][0], R[i + 1][1], z), [1, v0], [0, v1], [1, v1], up);
    }
    return g.build();
  }
  const O3 = new THREE.Object3D();
  function inst(geo, mat, list, fn, grp, shadow) {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => { O3.position.set(0, 0, 0); O3.rotation.set(0, 0, 0); O3.scale.set(1, 1, 1); const col = fn(O3, it, i); O3.updateMatrix(); m.setMatrixAt(i, O3.matrix); if (col && col.isColor) m.setColorAt(i, col); });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = shadow !== false; m.receiveShadow = true; grp.add(m); return m;
  }
  const at = (o, x, y, h) => o.position.copy(W(x, y, h));
  function boxAlong(o, a, b, h) { // orient unit box (x-axis) from site point a to b at height h
    at(o, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, h); o.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]); return Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const col = h => new THREE.Color(h).convertSRGBToLinear();

  // ------------------------------------------------------------ ground, site, context
  const sb = LY.site, sx = sb.map(p => p[0]), sy = sb.map(p => p[1]);
  const SITE = { x0: Math.min(...sx), x1: Math.max(...sx), y0: Math.min(...sy), y1: Math.max(...sy) };
  SITE.cx = (SITE.x0 + SITE.x1) / 2; SITE.cy = (SITE.y0 + SITE.y1) / 2;
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), M.ground); gp.rotation.x = -Math.PI / 2; gp.position.copy(W(SITE.cx, SITE.cy, -0.05)); gp.receiveShadow = true; G.ground.add(gp);
  M.paver.map.repeat.set(1, 1); M.paver.color.set(0xb4ab9e); M.walk.color.set(0xb9b3a8);
  flat(sb, 0.01, M.paver, G.ground, 5);
  (SC.context || []).forEach(b => { if (!b.fp || b.fp.length < 3) return; const c = b.fp.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]); if (Math.hypot(c[0] / b.fp.length - SITE.cx, c[1] / b.fp.length - SITE.cy) > 1300) return; try { const hk=Math.abs(Math.round(c[0]*7+c[1]*13)); const fm=[M.brickBrown,M.buff,M.brickRed,M.stoneF,M.charcoal,M.terracotta][hk%6]; prism(b.fp, 0, Math.max(7, b.h || (7+(hk%4)*3.3)), fm, (hk%3===0?M.meadow:M.roofGray), G.ctx, 6.6, 6.6); } catch (e) { } });
  (SC.parks || []).forEach(p => { try { flat(p.pts, 0.03, M.lawn, G.ctx, 10); } catch (e) { } });
  (LY.ctx_infill || []).forEach(b => { const c = b.fp.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]); const hk = Math.abs(Math.round(c[0] * 3 + c[1] * 11)); const fm = [M.brickBrown, M.buff, M.brickRed, M.stoneF, M.terracotta, M.darkglass][hk % 6]; try { prism(b.fp, 0, b.h, fm, (hk % 3 === 0 ? M.meadow : M.roofGray), G.ctx, 6.6, 6.6); } catch (e) { } });

  const ctxTrees = []; { const inSite = p => { let c = false; for (let i = 0, j = sb.length - 1; i < sb.length; j = i++) { const a = sb[i], b = sb[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const blds = [...(SC.context || []), ...(LY.ctx_infill || [])].map(b => { const xs = b.fp.map(p => p[0]), ys = b.fp.map(p => p[1]); return [Math.min(...xs) - 3, Math.max(...xs) + 3, Math.min(...ys) - 3, Math.max(...ys) + 3]; });
    let tries = 0; while (ctxTrees.length < 2200 && tries < 60000) { tries++; const x = SITE.x0 - 200 + rnd() * (SITE.x1 - SITE.x0 + 400), y = SITE.y0 - 170 + rnd() * (SITE.y1 - SITE.y0 + 340);
      if (x > SITE.x0 - 18 && x < SITE.x1 + 18 && y > SITE.y0 - 18 && y < SITE.y1 + 18) continue; if (inSite([x, y])) continue;
      if (blds.some(b => x > b[0] && x < b[1] && y > b[2] && y < b[3])) continue;
      if (LY.streets.some(st => st.pts.some((p, i) => i && (() => { const a = st.pts[i - 1], dx = p[0] - a[0], dy = p[1] - a[1], l2 = dx * dx + dy * dy || 1, tt = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l2)); return Math.hypot(x - a[0] - tt * dx, y - a[1] - tt * dy) < st.w / 2 + 2; })()))) continue;
      ctxTrees.push([x, y]); } }
  // ------------------------------------------------------------ streets, crosswalks, rails
  if(!LY.road_surfaces) LY.streets.forEach((s, i) => {
    if (s.sw) { mesh(strip(s.pts, s.w, 5, 0.04), M.paver, G.streets, false); return; }
    mesh(strip(s.pts, s.w + 7.5, 4, 0.04), M.walk, G.streets, false);
    mesh(strip(s.pts, s.w, 14, 0.09), M.asphalt, G.streets, false);
    if (s.ring) { mesh(strip(s.pts.map(p => p), 2.6, 4, 0.11 + i * 0.0005), M.brickPave, G.streets, false); }
  });
  inst(new THREE.BoxGeometry(1, 0.012, 0.6), M.white, LY.cross, (o, c) => { at(o, c[0], c[1], 0.108); o.rotation.y = c[2]; o.scale.x = c[3]; }, G.streets, false);
  LY.rails.forEach(r => {
    if (r.kind === 'platform') return;
    mesh(strip(r.pts, 6.5, 4, 0.12), M.rail, G.rails, false);
    [-0.72, 0.72].forEach(o => { const pts = r.pts.map((p, i) => { const a = r.pts[Math.max(0, i - 1)], b = r.pts[Math.min(r.pts.length - 1, i + 1)]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [p[0] - (b[1] - a[1]) / l * o, p[1] + (b[0] - a[0]) / l * o]; }); mesh(strip(pts, 0.12, 4, 0.3), M.track, G.rails, false); });
  });

  // ------------------------------------------------------------ open spaces
  LY.esplanades.forEach(e => flat(e, 0.04, M.paver, G.detail, 5));
  LY.paseos.forEach(e => flat(e, 0.05, M.paver, G.detail, 5));
  LY.courtyards.forEach(c => { flat(c, 0.06, M.lawn, G.detail, 10); });
  if (LY.curve_park) {
    flat(LY.curve_park, 0.06, M.lawn, G.detail, 12);
    const cp = LY.curve_park, mny = Math.min(...cp.map(p => p[1])), mxy = Math.max(...cp.map(p => p[1])), path = [];
    for (let k = 0; k <= 24; k++) { const y = mny + 6 + (mxy - mny - 12) * k / 24; const xs = cp.filter(p => Math.abs(p[1] - y) < 25).map(p => p[0]); const x = xs.length ? (Math.min(...xs) + Math.max(...xs)) / 2 + 8 * Math.sin(k * 0.7) : 1100; path.push([x, y]); }
    mesh(strip(path, 3.2, 4, 0.1), M.walk, G.detail, false);
  }

  // ------------------------------------------------------------ buildings
  const unitsOf = b => { let a = 0; const f = b.fp; for (let i = 0; i < f.length; i++) { const p = f[i], q = f[(i + 1) % f.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2 * b.fl * b.prog.resi * 0.82 / 85; };
  const balc = [], farms = [];
  LY.buildings.forEach(b => {
    const fm = FMAT[b.mat] || M.buff, g = new Geo(); let s;
    const gf = b.base ? (b.kind === 'market' ? b.h : 5.0) : 0, zf = b.base ? gf : b.z0;
    if (b.kind === 'market') {
      s = g.mark(); walls(g, b.fp, 0, b.h, 3.3, b.h, 0); g.group(s, 0);
    } else {
      if (b.base) { s = g.mark(); walls(g, b.fp, 0, gf, FT, 5.0, 0); g.group(s, 2); }
      s = g.mark(); walls(g, b.fp, zf, b.h, FT, FT, zf); g.group(s, 0);
      s = g.mark(); walls(g, b.fp, b.h, b.h + 1.0, 4, 4, 0); walls(g, b.inset, b.h, b.h + 1.0, 4, 4, 0, true); cap(g, b.fp, b.h + 1.0, 4, [b.inset]); g.group(s, 3);
    }
    const roofMat = b.kind === 'market' ? M.wood : (b.roof === 'meadow' || b.roof === 'farm') ? M.meadow : b.roof === 'terrace' ? M.paver : b.roof === 'membrane' ? M.membrane : M.roofGray;
    if (b.roof === 'farm' && !b.fountain_detail) farms.push(b);
    s = g.mark(); cap(g, b.kind === 'market' ? b.fp : b.inset, b.h + 0.12, b.roof === 'meadow' ? 9 : 4); g.group(s, 1);
    const m = mesh(g.build(), [b.kind === 'market' ? M.timber : fm, roofMat, b.prog.ret > 0.3 || b.kind === 'podium' ? M.shop : (b.mat === 'curtain' ? M.curtain : M.shop), M.coping], G.buildings);
    m.userData = { name: b.name, fl: b.fl, h: b.h, prog: b.prog, fp: b.fp, units: Math.round(unitsOf(b)) }; pick.push(m);
    if (b.kind === 'market') { // timber gable + clerestory
      const xs = b.fp.map(p => p[0]), ys = b.fp.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), hw = (y1 - y0) / 2 + 0.8;
      const sh = new THREE.Shape([new THREE.Vector2(-hw, 0), new THREE.Vector2(hw, 0), new THREE.Vector2(0, 5.2)]);
      const eg = new THREE.ExtrudeGeometry(sh, { depth: x1 - x0 + 1.6, bevelEnabled: false }); eg.rotateY(Math.PI / 2);
      const gm = new THREE.Mesh(eg, M.wood); gm.position.copy(W(x0 - 0.8, (y0 + y1) / 2, b.h)); gm.castShadow = true; G.buildings.add(gm);
    }
    if (b.prog.resi >= 0.5 && b.mat !== 'curtain' && b.kind !== 'market' && b.kind !== 'podium' && !b.name.startsWith('Entrance ') && !b.fountain_detail && !b.north_east_detail && !b.north_ref && b.mat !== 'refBronze' && b.mat !== 'darkglass') {
      const f = ccw(b.fp);
      for (let i = 0; i < f.length; i++) {
        const a = f[i], c = f[(i + 1) % f.length], L = Math.hypot(c[0] - a[0], c[1] - a[1]); if (L < 14) continue;
        const ux = (c[0] - a[0]) / L, uy = (c[1] - a[1]) / L, ox = uy, oy = -ux; // outward
        const nfl = b.base ? b.fl - 1 : b.fl;
        for (let k = 0; k < nfl; k++) {
          const z = zf + k * 3.3 + 0.05;
          for (let d = 3.3 * 1.5; d < L - 2; d += 13.2) balc.push([a[0] + ux * d + ox * 0.8, a[1] + uy * d + oy * 0.8, z, Math.atan2(uy, ux)]);
        }
      }
    }
  });
  // Reference-led fountain farm: exposed terrace crop rows, open trellises, facade planters.
  if(LY.fountain_detail){const d=LY.fountain_detail;
    const orientDetail=(o,q,z)=>{o.scale.x=boxAlong(o,q[0],q[1],z);};
    inst(new THREE.BoxGeometry(1,0.28,0.9),M.wood,d.beds,(o,q)=>orientDetail(o,q,q[2]),G.buildings);
    inst(new THREE.BoxGeometry(1,0.22,0.72),M.meadow,d.beds,(o,q)=>orientDetail(o,q,q[2]+0.22),G.buildings,false);
    inst(new THREE.BoxGeometry(0.10,2.7,0.10),M.ribSteel,d.posts,(o,q)=>at(o,q[0],q[1],q[2]+1.35),G.buildings,false);
    inst(new THREE.BoxGeometry(1,0.12,0.12),M.ribSteel,d.beams,(o,q)=>orientDetail(o,q,q[2]),G.buildings,false);
    inst(new THREE.BoxGeometry(2.5,0.38,0.48),M.coping,d.planters,(o,q)=>{at(o,q[0],q[1],q[2]);o.rotation.y=q[3];},G.buildings);
    inst(new THREE.BoxGeometry(2.3,0.28,0.40),M.meadow,d.planters,(o,q)=>{at(o,q[0],q[1],q[2]+0.26);o.rotation.y=q[3];},G.buildings,false);
    inst(new THREE.BoxGeometry(3.6,0.16,1.4),M.dark,d.canopies,(o,q)=>{at(o,q[0],q[1],q[2]);o.rotation.y=q[3];},G.buildings);
  }
  if(LY.north_east_detail){const d=LY.north_east_detail,along=(o,q,z)=>{o.scale.x=boxAlong(o,q[0],q[1],z);};
    inst(new THREE.BoxGeometry(1,0.3,0.85),M.coping,d.beds,(o,q)=>along(o,q,q[2]),G.buildings);
    inst(new THREE.BoxGeometry(1,0.25,0.65),M.meadow,d.beds,(o,q)=>along(o,q,q[2]+0.22),G.buildings,false);
    inst(new THREE.BoxGeometry(0.12,2.6,0.12),M.ribSteel,d.pergola_posts,(o,q)=>at(o,q[0],q[1],q[2]+1.3),G.buildings,false);
    inst(new THREE.BoxGeometry(1,0.12,0.12),M.ribSteel,d.pergola_beams,(o,q)=>along(o,q,q[2]),G.buildings,false);
    inst(new THREE.BoxGeometry(2.5,0.35,0.45),M.coping,d.facade_planters,(o,q)=>{at(o,q[0],q[1],q[2]);o.rotation.y=q[3];},G.buildings);
    inst(new THREE.BoxGeometry(2.3,0.25,0.36),M.meadow,d.facade_planters,(o,q)=>{at(o,q[0],q[1],q[2]+0.23);o.rotation.y=q[3];},G.buildings,false);
  }
  // rooftop farm: greenhouse frame + planting rows (ref: SW farm building)
  farms.forEach(b => { const xs = b.inset.map(p => p[0]), ys = b.inset.map(p => p[1]), x0 = Math.min(...xs) + 1, x1 = Math.max(...xs) - 1, y0 = Math.min(...ys) + 1, y1 = Math.max(...ys) - 1, z = b.h + 0.12;
    const posts = [], beams = [], rows = [];
    for (let x = x0; x <= x1 + 0.01; x += 6) for (let y = y0; y <= y1 + 0.01; y += (y1 - y0) / 4) posts.push([x, y]);
    for (let y = y0; y <= y1 + 0.01; y += (y1 - y0) / 4) beams.push([[x0, y], [x1, y]]);
    for (let x = x0; x <= x1 + 0.01; x += 6) beams.push([[x, y0], [x, y1]]);
    for (let y = y0 + 1.5; y < y1 - 1; y += 2.2) rows.push([[x0 + 1, y], [x1 - 1, y]]);
    inst(new THREE.BoxGeometry(0.18, 4.2, 0.18), M.white, posts, (o, q) => at(o, q[0], q[1], z + 2.1), G.buildings, false);
    inst(new THREE.BoxGeometry(1, 0.18, 0.18), M.white, beams, (o, q) => { o.scale.x = boxAlong(o, q[0], q[1], z + 4.2); }, G.buildings, false);
    inst(new THREE.BoxGeometry(1, 0.5, 1.1), M.tint, rows, (o, q, i) => { o.scale.x = boxAlong(o, q[0], q[1], z + 0.3); return col(['#5f8a3c', '#7fa04a', '#9a8a3a', '#4f7a38'][i % 4]); }, G.buildings);
    const gh = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.05, y1 - y0), M.greenhouse); gh.position.copy(W((x0 + x1) / 2, (y0 + y1) / 2, z + 4.3)); G.buildings.add(gh);
  });
  { const clumps = []; LY.buildings.forEach(b => { if (b.roof !== 'meadow' || b.fountain_detail || b.north_east_detail) return; const xs = b.inset.map(p => p[0]), ys = b.inset.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const n = Math.min(260, Math.round((x1 - x0) * (y1 - y0) / 9)); for (let k = 0; k < n; k++) clumps.push([x0 + 1 + rnd() * (x1 - x0 - 2), y0 + 1 + rnd() * (y1 - y0 - 2), b.h + 0.12, 0.45 + rnd() * 0.75]); });
    inst(new THREE.IcosahedronGeometry(1, 0), M.tint, clumps, (o, q) => { at(o, q[0], q[1], q[2] + q[3] * 0.35); o.scale.set(q[3], q[3] * (0.6 + rnd() * 0.9), q[3]); o.rotation.y = rnd() * 6; return col(['#6f8a3e', '#8a9a48', '#b39a52', '#c9a95a', '#a8603a', '#c47a3a', '#7a8a52', '#9a6a8a', '#d0b060', '#5f7a3a'][(rnd() * 10) | 0]); }, G.buildings, false); }
  inst(new THREE.BoxGeometry(2.7, 0.22, 1.6), M.coping, balc, (o, q) => { at(o, q[0], q[1], q[2]); o.rotation.y = q[3]; }, G.buildings);
  inst(new THREE.BoxGeometry(2.7, 1.0, 0.05), M.glassRail, balc, (o, q) => { at(o, q[0] + Math.sin(q[3]) * 0.78, q[1] - Math.cos(q[3]) * 0.78, q[2] + 0.6); o.rotation.y = q[3]; }, G.buildings, false);
  inst(new THREE.BoxGeometry(1, 1, 1), M.metal, LY.roofkit.mech, (o, q) => { at(o, q[0], q[1], q[2] + 0.12 + q[5] / 2); o.scale.set(q[3], q[5], q[4]); }, G.buildings);
  inst(new THREE.BoxGeometry(2.0, 0.06, 1.1), M.pv, LY.roofkit.pv, (o, q) => { at(o, q[0], q[1], q[2] + 0.55); o.rotation.x = 0.17; }, G.buildings);

  // Protected open-to-sky entrance approach: paving only, no canopy or cross-corridor furniture.
  if(C.entrance_breezeway){C.entrance_breezeway.fp.forEach(f=>flat(f,0.055,M.paver,G.core,3));}
  // Flat-fronted entrance lobby: an articulated facade before the main roof, not a roof replacement.
  if(C.entrance_lobby){const e=C.entrance_lobby,x=e.x,y=e.y0,w=e.half,h=e.height;
    const pane=std({color:0xb4ccd1,transparent:true,opacity:0.24,roughness:0.16,side:THREE.DoubleSide,depthWrite:false});
    const fg=new Geo();fg.tri(W(x-w,y,0),W(x+w,y,0),W(x+w,y,h),[0,0],[1,0],[1,1]);fg.tri(W(x-w,y,0),W(x+w,y,h),W(x-w,y,h),[0,0],[1,1],[0,1]);mesh(fg.build(),pane,G.core,false);
    const posts=[];for(let xx=x-w;xx<=x+w;xx+=2)posts.push([xx,y]);
    inst(new THREE.BoxGeometry(0.14,h,0.20),M.ribSteel,posts,(o,q)=>at(o,q[0],q[1],h/2),G.core,false);
    inst(new THREE.BoxGeometry(2*w,0.15,0.22),M.ribSteel,[3.5,5,9.5,14,h],(o,z)=>at(o,x,y,z),G.core,false);
    inst(new THREE.BoxGeometry(2*w+0.6,0.3,e.y1-y+0.4),M.coping,[0],o=>at(o,x,(y+e.y1)/2,h),G.core);
    inst(new THREE.BoxGeometry(2*w-0.3,0.16,1.2),M.white,[3.3],(o,z)=>at(o,x,y-0.45,z),G.core,false);
    for(const z of e.levels){inst(new THREE.BoxGeometry(1.7,0.25,e.y1-y),M.white,[-1,1],(o,sd)=>at(o,x+sd*(w-0.85),(y+e.y1)/2,z),G.core);}
    // Two complete helical flights with radial treads, central mast and continuous outer rail.
    // Dark frame makes the modest lobby legible against the pale main roof behind.
    const frame=std({color:0x37434a,roughness:0.55});
    inst(new THREE.BoxGeometry(0.32,h,0.42),frame,[-1,1],(o,sd)=>at(o,x+sd*w,y-0.04,h/2),G.core);
    inst(new THREE.BoxGeometry(2*w+0.5,0.5,0.5),frame,[h],(o,z)=>at(o,x,y-0.04,z),G.core);
    inst(new THREE.BoxGeometry(2*w,0.08,1.3),M.stone,[0],o=>at(o,x,y-0.35,0.08),G.core,false);
    const cy=(y+e.y1)/2,steps=[],rail=[];
    for(let k=0;k<64;k++){const a=k/32*Math.PI*2,z=k/64*9.5;steps.push([a,z]);rail.push(W(x+1.6*Math.cos(a),cy+1.6*Math.sin(a),z+1.05));}
    inst(new THREE.BoxGeometry(1.2,0.10,0.32),M.white,steps,(o,q)=>{at(o,x+0.8*Math.cos(q[0]),cy+0.8*Math.sin(q[0]),q[1]);o.rotation.y=q[0];},G.core);
    inst(new THREE.CylinderGeometry(0.10,0.10,9.5,12),M.ribSteel,[0],o=>at(o,x,cy,4.75),G.core,false);
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail),128,0.04,6,false),M.white,G.core,false);
  }
  // ------------------------------------------------------------ core: podium bands, market lanes, link
  const VH = C.vault.half, LE = C.LE, pv = C.pav;
  C.floor.forEach(f => flat(f, 0.03, M.stone, G.core, 3));
  C.lanes.forEach(f => flat(f, 0.035, M.paver, G.core, 4));
  C.bands.forEach(f => { const m = prism(f, 0, POD, M.podium, M.roofGray, G.core, 6, POD / 3, 0); m.userData = { name: 'Lloyd Commons — 3-level retail block, one piece with the galleria (roof park above)', fl: 3, h: POD, prog: { resi: 0, off: 0, ret: 1 }, fp: f, units: 0 }; pick.push(m); });
  C.roof_other.forEach(f => flat(f, POD + 0.06, M.paver, G.core, 9));
  (C.promenade || []).forEach(f => flat(f, POD + 0.08, M.paver, G.core, 6));
  if (C.liners) C.liners.fp.forEach(f => { const m = prism(f, C.liners.z0, C.liners.h, M.buff, M.meadow, G.core, FT, FT, C.liners.z0); m.userData = { name: 'Galleria liner (2-storey, green roof)', fl: C.liners.fl, h: C.liners.h, prog: { resi: 0, off: 0.2, ret: 0.8 }, fp: f, units: 0 }; pick.push(m); const g = new Geo(); walls(g, f, C.liners.h, C.liners.h + 0.8, 4, 4, 0); mesh(g.build(), M.coping, G.core); });
  { const cp = []; C.bands.forEach(f => { const g = new Geo(); walls(g, f, POD, POD + 0.9, 4, 4, 0); mesh(g.build(), M.coping, G.core); }); }
  const lk = prism(C.link, 0, 16.5, M.darkglass, M.roofGray, G.core, FT, FT, 0); lk.userData = { name: 'East link hall', fl: 3, h: 16.5, prog: { resi: 0, off: 0.3, ret: 0.7 }, fp: C.link, units: 0 }; pick.push(lk);
  const segs = C.vault.segs || [[C.vault.x0, pv.x - pv.hx, AX], [pv.x + pv.hx, C.vault.x1, AX]];
  // market kiosks with white canopies in the open-air lanes (refs: aerial market streets)
  const KS = LY.kiosks || [];
  inst(new THREE.BoxGeometry(3.4, 1.1, 2.0), M.wood, KS, (o, q) => at(o, q[0], q[1], (q[3] || 0) + 0.85), G.detail);
  inst(new THREE.BoxGeometry(3.2, 0.35, 1.8), M.tint, KS, (o, q, i) => { at(o, q[0], q[1], (q[3] || 0) + 1.55); return col(['#c9772e', '#9bb04a', '#d9b04a', '#b8452e', '#6f8f3a'][i % 5]); }, G.detail, false);
  inst(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 4), M.white, KS.flatMap(q => [[q[0] - 1.9, q[1] - 1.5, q[3]], [q[0] + 1.9, q[1] - 1.5, q[3]], [q[0] - 1.9, q[1] + 1.5, q[3]], [q[0] + 1.9, q[1] + 1.5, q[3]]]), (o, q) => at(o, q[0], q[1], (q[2] || 0) + 1.45), G.detail, false);
  inst(new THREE.ConeGeometry(2.9, 1.1, 4), M.tent, KS, (o, q) => { at(o, q[0], q[1], (q[3] || 0) + 3.05); o.rotation.x = 0; }, G.detail);
  // Freestanding glazed west threshold above the low venue connector.
  if(C.west_portal){const p=C.west_portal,g=new Geo(),R=(p.half*p.half+p.rise*p.rise)/(2*p.rise),zc=p.spring+p.rise-R;
    for(let k=0;k<48;k++){const a=-p.half+2*p.half*k/48,b=-p.half+2*p.half*(k+1)/48;
      const za=zc+Math.sqrt(R*R-a*a),zb=zc+Math.sqrt(R*R-b*b);
      const A=W(p.x,p.y+a,6.75),B=W(p.x,p.y+b,6.75),D=W(p.x,p.y+b,zb),E=W(p.x,p.y+a,za);
      g.tri(A,B,D,[0,0],[1,0],[1,1]);g.tri(A,D,E,[0,0],[1,1],[0,1]);
    }mesh(g.build(),M.hallClere,G.vault,false);
    const bars=[];for(let y=-p.half;y<=p.half;y+=3){const z=zc+Math.sqrt(R*R-y*y);bars.push([[p.x,p.y+y,6.75],[p.x,p.y+y,z]]);}
    inst(new THREE.BoxGeometry(1,0.16,0.18),M.ribSteel,bars,(o,q)=>{const a=W(...q[0]),b=W(...q[1]);o.position.copy(a).add(b).multiplyScalar(0.5);o.lookAt(b);o.rotateY(Math.PI/2);o.scale.x=a.distanceTo(b);},G.vault,false);
  }
  // rink inside the crossing hall
  const rk = C.rink, rfp = C.rink_fp || [[rk.x - rk.w / 2, rk.y - rk.d / 2], [rk.x + rk.w / 2, rk.y - rk.d / 2], [rk.x + rk.w / 2, rk.y + rk.d / 2], [rk.x - rk.w / 2, rk.y + rk.d / 2]];
  flat(rfp, 0.08, M.ice, G.core, 61);
  { const g = new Geo(); walls(g, rfp, 0, 1.0, 4, 4, 0); walls(g, rfp, 0, 1.0, 4, 4, 0, true); mesh(g.build(), M.white, G.core); }
  { const g = new Geo(); walls(g, rfp, 1.0, 2.1, 4, 4, 0); walls(g, rfp, 1.0, 2.1, 4, 4, 0, true); mesh(g.build(), M.glassRail, G.core, false); }

  // ------------------------------------------------------------ freestanding glass barrel vault (springs from a low glazed base)
  const V = C.vault, Rv = (VH * VH + V.rise * V.rise) / (2 * V.rise), cyv = V.spring + V.rise - Rv, th = Math.asin(VH / Rv);
  segs.forEach(sg => {
    const nx = Math.max(2, Math.round((sg[1] - sg[0]) / 3)), na = 20, g = new Geo(), up = new THREE.Vector3(0, 1, 0);
    const P = (x, s) => W(x, sg[2] + Rv * Math.sin(s), cyv + Rv * Math.cos(s));
    for (let i = 0; i < nx; i++) for (let j = 0; j < na; j++) {
      const x0 = sg[0] + (sg[1] - sg[0]) * i / nx, x1 = sg[0] + (sg[1] - sg[0]) * (i + 1) / nx, s0 = -th + 2 * th * j / na, s1 = -th + 2 * th * (j + 1) / na;
      const u0 = (x0 - sg[0]) / 3, u1 = (x1 - sg[0]) / 3, v0 = (s0 + th) * Rv / 2.4, v1 = (s1 + th) * Rv / 2.4;
      g.tri(P(x0, s0), P(x1, s0), P(x1, s1), [u0, v0], [u1, v0], [u1, v1], up); g.tri(P(x0, s0), P(x1, s1), P(x0, s1), [u0, v0], [u1, v1], [u0, v1], up);
    }
    const vm = mesh(g.build(), M.glass, G.vault, false); vm.renderOrder = 2;
    // glazed base walls with warm shopfronts inside (spring line at V.spring)
    [sg[0], sg[1]].forEach(xe => {
      if (Math.abs(Math.abs(xe - pv.x) - pv.hx) < 1) return; const gg = new Geo(), ring = [];
      for (let j = 0; j <= na; j++) { const s = -th + 2 * th * j / na; ring.push([sg[2] + Rv * Math.sin(s), cyv + Rv * Math.cos(s)]); }
      for (let j = 0; j < na; j++) gg.tri(W(xe, ring[j][0], 0), W(xe, ring[j][0], ring[j][1]), W(xe, ring[j + 1][0], ring[j + 1][1]), [0, 0], [0, 1], [1, 1], new THREE.Vector3(xe < pv.x ? -1 : 1, 0, 0));
      gg.tri(W(xe, sg[2] - VH, 0), W(xe, sg[2] + VH, 0), W(xe, sg[2] + VH, V.spring), [0, 0], [1, 0], [1, 1], new THREE.Vector3(xe < pv.x ? -1 : 1, 0, 0));
      gg.tri(W(xe, sg[2] - VH, 0), W(xe, sg[2] + VH, V.spring), W(xe, sg[2] - VH, V.spring), [0, 0], [1, 1], [0, 1], new THREE.Vector3(xe < pv.x ? -1 : 1, 0, 0));
      if (Math.abs(Math.abs(xe - pv.x) - pv.hx) < 1) { const pm = []; for (let yy = sg[2] - VH + 1; yy < sg[2] + VH; yy += 2) { const dd = yy - sg[2]; pm.push([xe, yy, cyv + Math.sqrt(Rv * Rv - dd * dd)]); }
        inst(new THREE.BoxGeometry(0.1, 1, 0.1), M.ribSteel, pm, (o, q) => { at(o, q[0], q[1], q[2] / 2); o.scale.y = q[2]; }, G.vault, false); }
      mesh(gg.build(), M.glassEnd, G.vault, false);
    });
  });
  const ribShape = new THREE.Shape(); { const ro = Rv + 0.12, ri = Rv - 0.45, N = 28; for (let j = 0; j <= N; j++) { const s = -th + 2 * th * j / N; const v = new THREE.Vector2(ro * Math.sin(s), cyv + ro * Math.cos(s)); j ? ribShape.lineTo(v.x, v.y) : ribShape.moveTo(v.x, v.y); } for (let j = N; j >= 0; j--) { const s = -th + 2 * th * j / N; ribShape.lineTo(ri * Math.sin(s), cyv + ri * Math.cos(s)); } }
  const ribG = new THREE.ExtrudeGeometry(ribShape, { depth: 0.26, bevelEnabled: false, curveSegments: 1 }); ribG.translate(0, 0, -0.13); ribG.rotateY(Math.PI / 2);
  const ribs = [], glu = []; segs.forEach(sg => { let k = 0; for (let x = sg[0] + 0.5; x <= sg[1] - 0.3; x += 3, k++) (k % 3 === 0 ? glu : ribs).push([x, sg[2]]); });
  inst(ribG, M.ribSteel, ribs, (o, q) => at(o, q[0], q[1], 0), G.vault);
  inst(ribG, M.glulam, glu, (o, q) => { at(o, q[0], q[1], 0); o.scale.set(3.2, 1, 1); }, G.vault);
  const purl = []; segs.forEach(sg => { for (let j = 1; j < 10; j++) { const s = -th + 2 * th * j / 10; purl.push([sg, sg[2] + (Rv + 0.05) * Math.sin(s), cyv + (Rv + 0.05) * Math.cos(s)]); } });
  inst(new THREE.BoxGeometry(1, 0.12, 0.12), M.ribSteel, purl, (o, q) => { at(o, (q[0][0] + q[0][1]) / 2, q[1], q[2]); o.scale.x = q[0][1] - q[0][0]; }, G.vault, false);
  const pend = []; segs.forEach(sg => { for (let x = sg[0] + 4; x < sg[1] - 3; x += 6) pend.push([x, sg[2]]); });
  inst(new THREE.SphereGeometry(0.42, 10, 8), M.glow, pend, (o, q) => at(o, q[0], q[1], V.spring + V.rise - 4.5), G.vault, false);
  inst(new THREE.BoxGeometry(1, 0.12, 2 * VH - 1), M.glow, segs, (o, q) => { at(o, (q[0] + q[1]) / 2, q[2], 0.06); o.scale.x = q[1] - q[0] - 1; }, G.vault, false);

  // ------------------------------------------------------------ galleria interior: 3 levels open to the vault (refs: ref7 interiors)
  { const BAL = C.BAL || 3.2, LV = C.levels || [5.0, 9.5], IN = LY.interior || { tables: [], carts: [], pots: [], bridges: [], benches: [] };
    const slabs = [], rails = [], cols = [], fasc = [], vines = [], shopU = [];
    segs.forEach(sg => { [-1, 1].forEach(sd => { const ye = sg[2] + sd * (VH - BAL), yw = sg[2] + sd * VH;
      LV.forEach(z => { slabs.push([sg[0], sg[1], (ye + yw) / 2, z]); rails.push([sg[0], sg[1], ye - sd * 0.05, z]); });
      for (let x = sg[0] + 6; x < sg[1] - 2; x += 12) { cols.push([x, ye + sd * 0.35]); if (((x - sg[0]) / 12 | 0) % 2 === 0) vines.push([x + 6, ye - sd * 0.1, LV[(x / 9 | 0) % 2]]); }
      shopU.push([sg[0], sg[1], yw - sd * 0.06]); }); });
    inst(new THREE.BoxGeometry(1, 0.55, BAL), M.coping, slabs, (o, q) => { at(o, (q[0] + q[1]) / 2, q[2], q[3] - 0.28); o.scale.x = q[1] - q[0]; }, G.core);
    inst(new THREE.BoxGeometry(1, 1.1, 0.06), M.glassRail, rails, (o, q) => { at(o, (q[0] + q[1]) / 2, q[2], q[3] + 0.55); o.scale.x = q[1] - q[0]; }, G.core, false);
    inst(new THREE.BoxGeometry(1, 0.08, 0.12), M.dark, rails, (o, q) => { at(o, (q[0] + q[1]) / 2, q[2], q[3] + 1.12); o.scale.x = q[1] - q[0]; }, G.core, false);
    inst(new THREE.CylinderGeometry(0.42, 0.42, 1, 10), M.white, cols, (o, q) => { at(o, q[0], q[1], (POD + V.spring * 0 + 0.9) / 2); o.scale.y = POD + 0.9; }, G.core);
    inst(new THREE.BoxGeometry(2.6, 1.6, 0.5), M.tint, vines, (o, q) => { at(o, q[0], q[1], q[2] - 0.9); return col(['#4f7a34', '#5f8a3c', '#6f9a44'][(rnd() * 3) | 0]); }, G.core, false);
    // atrium floor life
    inst(new THREE.CylinderGeometry(0.9, 0.7, 0.9, 12), M.dark, IN.pots, (o, q) => at(o, q[0], q[1], 0.45), G.detail);
    inst(new THREE.BoxGeometry(4.2, 0.12, 1.1), M.wood, IN.tables, (o, q) => at(o, q[0], q[1], 0.76), G.detail);
    inst(new THREE.BoxGeometry(4.0, 0.08, 0.35), M.wood, IN.tables.flatMap(q => [[q[0], q[1] - 0.85], [q[0], q[1] + 0.85]]), (o, q) => at(o, q[0], q[1], 0.45), G.detail, false);
    inst(new THREE.BoxGeometry(2.4, 0.9, 1.3), M.wood, IN.carts, (o, q) => at(o, q[0], q[1], 0.75), G.detail);
    inst(new THREE.IcosahedronGeometry(1, 0), M.tint, IN.carts.flatMap(q => [[q[0] - 0.6, q[1]], [q[0] + 0.6, q[1]]]), (o, q, i) => { at(o, q[0], q[1], 1.35); o.scale.set(0.7, 0.45, 0.6); return col(['#5f8a3c', '#d9b04a', '#7fa04a', '#c96a3a'][i % 4]); }, G.detail, false);
    inst(new THREE.BoxGeometry(2.4, 0.45, 0.6), M.dark, IN.benches, (o, q) => at(o, q[0], q[1], 0.23), G.detail);
    // cross bridges at both upper levels
    const br = []; IN.bridges.forEach(b => LV.forEach(z => br.push([b[0], b[1], z])));
    inst(new THREE.BoxGeometry(4.0, 0.55, 1), M.coping, br, (o, q) => { at(o, q[0], q[1], q[2] - 0.28); o.scale.z = 2 * (VH - BAL) + 0.2; }, G.core);
    inst(new THREE.BoxGeometry(0.06, 1.1, 1), M.glassRail, br.flatMap(q => [[q[0] - 2, q[1], q[2]], [q[0] + 2, q[1], q[2]]]), (o, q) => { at(o, q[0], q[1], q[2] + 0.55); o.scale.z = 2 * (VH - BAL); }, G.core, false);
    // suspended 'LLOYD COMMONS' sign boards at each end of the wings
    const sg2 = []; segs.forEach(sg => { sg2.push([sg[0] + 2.5, sg[2]]); sg2.push([sg[1] - 2.5, sg[2]]); });
    { const c = env.canvas(512, 96), t = c.getContext('2d'); t.fillStyle = '#efe9dc'; t.fillRect(0, 0, 512, 96); t.fillStyle = '#3a3530'; t.font = '600 46px Helvetica, Arial, sans-serif'; t.textAlign = 'center'; t.textBaseline = 'middle'; t.fillText('LLOYD COMMONS', 256, 50);
      const sm = std({ map: new THREE.CanvasTexture(c), roughness: 0.8 }); inst(new THREE.BoxGeometry(0.3, 2.0, 10), sm, sg2, (o, q) => at(o, q[0], q[1], LV[1] + 2.4), G.core); }
  }

  // ------------------------------------------------------------ crossing hall (ref8): chamfered-rectangle glass pavilion, tall clerestory,
  // eave above vault crowns; transverse narrow ridge, clipped facets and actual skylight openings.
  const hfp = C.pav_fp, hz = pv.eave || 27.5, top = C.hall_top || hfp, hov = pv.ov || 2.2;
  const archZ = (sg, y) => { const d = y - sg[2]; return Math.abs(d) >= VH ? 0 : cyv + Math.sqrt(Rv * Rv - d * d); };
  { const g = new Geo(); let st = g.mark(); const f = ccw(hfp);
    const wW = segs.find(q => Math.abs(q[1] - (pv.x - pv.hx)) < 1), wE = segs.find(q => Math.abs(q[0] - (pv.x + pv.hx)) < 1);
    const mul = [], trans = [];
    for (let i = 0; i < f.length; i++) { const a = f[i], b = f[(i + 1) % f.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const out = new THREE.Vector3(b[1] - a[1], 0, b[0] - a[0]);
      const wing = Math.abs(a[0] - b[0]) < 0.1 ? (Math.abs(a[0] - (pv.x - pv.hx)) < 0.5 ? wW : Math.abs(a[0] - (pv.x + pv.hx)) < 0.5 ? wE : null) : null;
      const n = Math.max(1, Math.round(L / 1.0));
      for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n, p0 = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], p1 = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
        const z0 = wing ? archZ(wing, p0[1]) : 0, z1 = wing ? archZ(wing, p1[1]) : 0, u0 = L * t0 / 6, u1 = L * t1 / 6;
        g.tri(W(p0[0], p0[1], z0), W(p1[0], p1[1], z1), W(p1[0], p1[1], hz), [u0, z0 / hz], [u1, z1 / hz], [u1, 1], out);
        g.tri(W(p0[0], p0[1], z0), W(p1[0], p1[1], hz), W(p0[0], p0[1], hz), [u0, z0 / hz], [u1, 1], [u0, 1], out); }
      for (let d = 0; d <= L + 0.01; d += 3) { const q = [a[0] + (b[0] - a[0]) * d / L, a[1] + (b[1] - a[1]) * d / L]; mul.push([q[0], q[1], wing ? archZ(wing, q[1]) : 0]); }
      [POD, (POD + hz) / 2].forEach(z => trans.push([a, b, z, wing]));
    }
    g.group(st, 0);
    const m = mesh(g.build(), M.hallClere, G.vault, false); m.renderOrder = 1; m.userData = { name: 'Crossing Hall — civic court + ice rink (72 × 64 m; conceptual dimensions)', fl: 1, h: pv.apex, prog: { resi: 0, off: 0, ret: 1 }, fp: hfp, units: 0 }; pick.push(m);
    inst(new THREE.BoxGeometry(0.22, 1, 0.3), M.ribSteel, mul, (o, q) => { at(o, q[0], q[1], (q[2] + hz) / 2); o.scale.y = hz - q[2]; }, G.vault, false);
    const tr = []; trans.forEach(t => { const a = t[0], b = t[1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 1.5));
      for (let k = 0; k < n; k++) { const pa = [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n], pb = [a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n];
        if (t[3] && (archZ(t[3], pa[1]) > t[2] || archZ(t[3], pb[1]) > t[2])) continue; tr.push([pa, pb, t[2]]); } });
    inst(new THREE.BoxGeometry(1, 0.3, 0.32), M.ribSteel, tr, (o, q) => { o.scale.x = boxAlong(o, q[0], q[1], q[2]); }, G.vault, false);
  }
  { // reference-led transverse line ridge; mutually exclusive glass and metal patches
    const met = new Geo(), sky = new Geo(), up = new THREE.Vector3(0,1,0);
    (C.roof_patches || []).forEach(p => {
      const g = p.glass ? sky : met, pts = p.pts;
      for (let i=1;i<pts.length-1;i++) {
        const vs = [pts[0],pts[i],pts[i+1]];
        g.tri(...vs.map(q=>W(q[0],q[1],q[2])), ...vs.map(q=>[(q[0]-pv.x)/4,(q[1]-pv.y)/4]), up);
      }
    });
    const roofMetal = mesh(met.build(),M.hallRoof,G.vault);
    roofMetal.userData.roofMaterial = 'opaque';
    const glazing = std({color:0x7f9aa6,roughness:0.08,metalness:0.55,envMapIntensity:1.8,transparent:true,opacity:0.88,side:THREE.DoubleSide,depthWrite:false});
    const roofGlass = mesh(sky.build(),glazing,G.vault,false);
    roofGlass.renderOrder = 3; roofGlass.userData.roofMaterial = 'glass';
    const along = (o,q) => { const a=W(...q[0]),b=W(...q[1]);o.position.copy(a).add(b).multiplyScalar(0.5);o.lookAt(b);o.rotateY(Math.PI/2);o.scale.x=a.distanceTo(b); };
    inst(new THREE.BoxGeometry(1,0.10,0.13),M.ribSteel,C.roof_lines || [],along,G.vault,false);
    inst(new THREE.BoxGeometry(1,0.18,0.5),M.coping,[C.roof_ridge],along,G.vault,false);
    const ex=C.roof_eave, rs=C.roof_surface;
    const rz=(x,y)=>hz+(pv.apex-hz)*Math.max(0,Math.min(1,(rs.hx-Math.abs(x-pv.x))/rs.end,(rs.hy-Math.abs(y-pv.y))/rs.hy));
    // Close the raised end-wall wedge between the clerestory eave and pitched roof.
    const endGlass=new Geo();
    hfp.forEach((a,i)=>{const b=hfp[(i+1)%hfp.length],L=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(L/2);
      for(let k=0;k<n;k++){const p=[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n],q=[a[0]+(b[0]-a[0])*(k+1)/n,a[1]+(b[1]-a[1])*(k+1)/n];
        endGlass.tri(W(...p,hz),W(...q,hz),W(...q,rz(...q)),[0,0],[1,0],[1,1]);
        endGlass.tri(W(...p,hz),W(...q,rz(...q)),W(...p,rz(...p)),[0,0],[1,1],[0,1]);
      }
    });mesh(endGlass.build(),M.hallClere,G.vault,false);
    const fg=new Geo();
    ex.forEach((a,i)=>{const b=ex[(i+1)%ex.length];
      const A=W(a[0],a[1],rz(...a)),B=W(b[0],b[1],rz(...b));
      const C0=W(a[0],a[1],rz(...a)-0.55),D=W(b[0],b[1],rz(...b)-0.55);
      fg.tri(A,B,D,[0,0],[1,0],[1,1]);fg.tri(A,D,C0,[0,0],[1,1],[0,1]);
    });mesh(fg.build(),M.coping,G.vault);
    inst(new THREE.BoxGeometry(1,0.18,0.28),M.coping,C.roof_hips,along,G.vault,false);
    // Separate pressure caps, perimeter flashings, and standing seams.
    inst(new THREE.BoxGeometry(1,0.13,0.22),M.coping,C.roof_flashings,along,G.vault,false);
    inst(new THREE.BoxGeometry(1,0.045,0.045),M.coping,C.roof_seams,along,G.vault,false);
    // Folded ridge cap: two sloped metal flanges rather than a floating rectangular bar.
    const ridge=C.roof_ridge, capGeo=new Geo();
    for(const sd of [-1,1]){
      const a=ridge[0],b=ridge[1],dy=sd*0.45;
      const c=[b[0],b[1]+dy,rz(b[0],b[1]+dy)+0.04],d=[a[0],a[1]+dy,rz(a[0],a[1]+dy)+0.04];
      capGeo.tri(W(a[0],a[1],a[2]+0.10),W(b[0],b[1],b[2]+0.10),W(...c),[0,0],[1,0],[1,1],up);
      capGeo.tri(W(a[0],a[1],a[2]+0.10),W(...c),W(...d),[0,0],[1,1],[0,1],up);
    }mesh(capGeo.build(),M.hallRoof,G.vault);
    // Continuous recessed soffit closes the overhang, without blocking skylight fields.
    const soffit=new Geo();cap(soffit,ex,hz-0.55,4,[hfp],true);mesh(soffit.build(),M.coping,G.vault);
    // Curved weathering collar at each vault-to-curtain-wall junction.
    const collars=[];
    segs.forEach(sg=>{const x=sg[0]<pv.x?sg[1]:sg[0];
      for(let k=0;k<48;k++){
        const y0=sg[2]-VH+2*VH*k/48,y1=sg[2]-VH+2*VH*(k+1)/48;
        collars.push([[x,y0,archZ(sg,y0)+0.10],[x,y1,archZ(sg,y1)+0.10]]);
      }
    });
    inst(new THREE.BoxGeometry(1,0.18,0.45),M.coping,collars,along,G.vault,false);
  }
  if (false) { // retired plateau implementation, retained for comparison only
    const f = ccw(hfp), T = ccw(top), up = new THREE.Vector3(0, 1, 0), cz = pv.apex;
    const ex = f.map((p, i) => { const a = f[(i + f.length - 1) % f.length], b = f[(i + 1) % f.length];
      const n1 = [a[1] - p[1], p[0] - a[0]], n2 = [p[1] - b[1], b[0] - p[0]], l1 = Math.hypot(...n1), l2 = Math.hypot(...n2);
      const nx = -(n1[0] / l1 + n2[0] / l2), ny = -(n1[1] / l1 + n2[1] / l2), nl = Math.hypot(nx, ny), k = hov / Math.max(0.5, (nx * (-n1[0] / l1) + ny * (-n1[1] / l1)) / nl);
      return [p[0] + nx / nl * k, p[1] + ny / nl * k]; });
    const near = p => { let bi = 0, bd = 1e9; T.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; bi = i; } }); return bi; };
    const map = f.map(p => near(p));
    const met = new Geo(), sky = new Geo(), frames = [];
    const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let i = 0; i < f.length; i++) { const j = (i + 1) % f.length, a = ex[i], b = ex[j], ta = T[map[i]], tb = T[map[j]];
      const A = W(a[0], a[1], hz), B = W(b[0], b[1], hz), TB = W(tb[0], tb[1], cz), TA = W(ta[0], ta[1], cz);
      const long = Math.abs(f[i][1] - f[j][1]) < 0.1 && Math.hypot(f[j][0] - f[i][0], f[j][1] - f[i][1]) > 30;   // ref9 k8: glass on the long slopes...
      const side = Math.abs(f[i][0] - f[j][0]) < 0.1 && Math.hypot(f[j][0] - f[i][0], f[j][1] - f[i][1]) > 30;   // ...and on the vault-end slopes
      met.tri(A, B, TB, [0, 0], [1, 0], [1, 1], up); met.tri(A, TB, TA, [0, 0], [1, 1], [0, 1], up);
      if (long || side) { // skylight field: inset panel band on the slope (2 bands on long slopes, 1 on short ends)
        const bands = long ? [[0.04, 0.96]] : side ? [[0.12, 0.88]] : [];
        bands.forEach(bd => { const s0 = 0.05, s1 = 0.97;
          const P = (u, v) => { const lo = lerp(a, b, u), hi = lerp(ta, tb, u), p = lerp(lo, hi, v), z = hz + (cz - hz) * v + 0.12; return [p, z]; };
          const q00 = P(bd[0], s0), q10 = P(bd[1], s0), q11 = P(bd[1], s1), q01 = P(bd[0], s1);
          sky.tri(W(q00[0][0], q00[0][1], q00[1]), W(q10[0][0], q10[0][1], q10[1]), W(q11[0][0], q11[0][1], q11[1]), [0, 0], [6, 0], [6, 3], up);
          sky.tri(W(q00[0][0], q00[0][1], q00[1]), W(q11[0][0], q11[0][1], q11[1]), W(q01[0][0], q01[0][1], q01[1]), [0, 0], [6, 3], [0, 3], up);
          for (let k = 0; k <= 16; k++) { const u = bd[0] + (bd[1] - bd[0]) * k / 16, p0 = P(u, s0), p1 = P(u, s1); frames.push([p0, p1]); }
          for (let k = 0; k <= 5; k++) { const v = s0 + (s1 - s0) * k / 5, p0 = P(bd[0], v), p1 = P(bd[1], v); frames.push([p0, p1]); } }); }
    }
    { let s0 = met.mark(); cap(met, T, cz, 4); } // plateau
    const rm = mesh(met.build(), M.hallRoof, G.vault); rm.renderOrder = 1;
    const sm = mesh(sky.build(), M.pavRoof, G.vault, false); sm.renderOrder = 2;
    { // plateau skylight strip + mechanical
      const xs = T.map(p => p[0]), ys = T.map(p => p[1]), x0 = Math.min(...xs) + 5, x1 = Math.max(...xs) - 5, y0 = pv.y - 3.5, y1 = pv.y + 3.5;
      const g = new Geo(); cap(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], cz + 0.25, 3); const p = mesh(g.build(), M.pavRoof, G.vault, false); p.renderOrder = 2;
      for (let x = x0; x <= x1 + 0.01; x += (x1 - x0) / 12) frames.push([[[x, y0], cz + 0.27], [[x, y1], cz + 0.27]]);
      for (let y = y0; y <= y1 + 0.01; y += 3) frames.push([[[x0, y], cz + 0.27], [[x1, y], cz + 0.27]]); }
    inst(new THREE.BoxGeometry(1, 0.12, 0.12), M.ribSteel, frames, (o, q) => { const a = W(q[0][0][0], q[0][0][1], q[0][1]), b = W(q[1][0][0], q[1][0][1], q[1][1]); o.position.copy(a).add(b).multiplyScalar(0.5); o.lookAt(b); o.rotateY(Math.PI / 2); o.scale.x = a.distanceTo(b); }, G.vault, false);
    // hips + plateau edge + fascia band (crisp beveled lip)
    const hips = f.map((p, i) => [ex[i], T[map[i]]]);
    inst(new THREE.BoxGeometry(1, 0.32, 0.55), M.coping, hips, (o, q) => { const a = W(q[0][0], q[0][1], hz), b = W(q[1][0], q[1][1], cz); o.position.copy(a).add(b).multiplyScalar(0.5); o.lookAt(b); o.rotateY(Math.PI / 2); o.scale.x = a.distanceTo(b); }, G.vault, false);
    inst(new THREE.BoxGeometry(1, 0.35, 0.5), M.coping, T.map((a, i) => [a, T[(i + 1) % T.length]]), (o, q) => { o.scale.x = boxAlong(o, q[0], q[1], cz + 0.1); }, G.vault, false);
    const fg = new Geo(); walls(fg, ex, hz - 1.4, hz + 0.25, 4, 4, 0); cap(fg, ex, hz - 1.4, 4, [f], true); mesh(fg.build(), M.coping, G.vault);
  }
  { // interior (ref9 k1-k7): ring balconies L2 + L3 food court, glulam tied arches across the hall, white steel space trusses
    // following the roof slopes, slatted timber 'LC' chandelier over the rink, escalators, food-court tables, warm downlights
    const LV = C.levels || [5.0, 9.5], rings = C.hall_rings || (C.hall_ring ? [C.hall_ring, C.hall_ring] : []), cz = pv.apex;
    const rs = C.roof_surface;
    const roofZ = (x,y) => hz+(cz-hz)*Math.max(0,Math.min(1,(rs.hx-Math.abs(x-pv.x))/rs.end,(rs.hy-Math.abs(y-pv.y))/rs.hy));
    rings.forEach((ring, li) => { const z = LV[li];
      const g = new Geo(); cap(g, ring[0], z, 4, [ring[1]]); cap(g, ring[0], z - 0.6, 4, [ring[1]], true); walls(g, ring[1], z - 0.6, z + 0.05, 4, 4, 0, true); mesh(g.build(), M.coping, G.core);
{ const fg = new Geo(); walls(fg, ring[1], z - 0.6, z + 0.45, 4, 4, 0, true); walls(fg, ring[1], z - 0.6, z + 0.45, 4, 4, 0); mesh(fg.build(), li === 0 ? M.podium : M.white, G.core); }
      { const rg = new Geo(); walls(rg, ring[1], z + 0.45, z + 1.15, 4, 4, 0, true); walls(rg, ring[1], z + 0.45, z + 1.15, 4, 4, 0); mesh(rg.build(), M.glassRail, G.core, false); }
      inst(new THREE.BoxGeometry(1, 0.1, 0.12), M.dark, ring[1].map((p, i) => [p, ring[1][(i + 1) % ring[1].length]]), (o, q) => { o.scale.x = boxAlong(o, q[0], q[1], z + 1.17); }, G.core, false);
      const lights = ring[1].filter((_, i) => i % 2 === 0); inst(new THREE.BoxGeometry(0.5, 0.05, 0.5), M.glow, lights, (o, q) => at(o, q[0] + (q[0] - pv.x) * 0.04, q[1] + (q[1] - pv.y) * 0.04, z - 0.63), G.core, false);
      const ferns = ring[1].filter((_, i) => i % 3 === 0).map(p => [p[0] + (pv.x - p[0]) * 0.02, p[1] + (pv.y - p[1]) * 0.02, z]);
      inst(new THREE.IcosahedronGeometry(0.55, 0), M.tint, ferns, (o, q) => { at(o, q[0], q[1], q[2] - 0.9); o.scale.set(1, 1.5, 1); return col(['#4f7a34', '#5f8a3c', '#6f9a44'][(rnd() * 3) | 0]); }, G.core, false); });
    // storefront signs on the L1 inner wall (ref9 k1; hub: rink + food hall + retail bays + events)
    { const SN = ['LOCAL FOOD HALL', 'BAKERY', 'COMMUNITY CLASSROOMS', 'THE LIBRARY', 'PORTLAND MARKET'], rp = rings[0][1];
      const per = rp.map((p, i) => { const q = rp[(i + 1) % rp.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); }).reduce((a, b) => a + b, 0);
      let acc = 0, si = 0; const targets = [0.1, 0.3, 0.5, 0.7, 0.9].map(t => t * per);
      for (let i = 0; i < rp.length && si < targets.length; i++) { const p = rp[i], q = rp[(i + 1) % rp.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]);
        while (si < targets.length && acc + L >= targets[si]) { const t = (targets[si] - acc) / L, px = p[0] + (q[0] - p[0]) * t, py = p[1] + (q[1] - p[1]) * t;
          const nx = px - pv.x, ny = py - pv.y, nl = Math.hypot(nx, ny) || 1, mx = -nx / nl, my = -ny / nl;   // inward
          const c = env.canvas(512, 64), tc = c.getContext('2d'); tc.fillStyle = '#f4efe4'; tc.fillRect(0, 0, 512, 64); tc.fillStyle = '#4a3a2c'; tc.font = '600 34px Helvetica, Arial, sans-serif'; tc.textAlign = 'center'; tc.textBaseline = 'middle'; tc.fillText(SN[si], 256, 34);
          const pl = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.4), std({ map: new THREE.CanvasTexture(c), roughness: 0.7 }));
          pl.position.copy(W(px + mx * 0.15, py + my * 0.15, 3.0)); pl.rotation.y = Math.atan2(mx, -my); G.core.add(pl); si++; }
        acc += L; } }
    // food court on L3 (ref9 k2/k4/k6)
    const FT2 = C.food_tables || [], z3 = LV[1];
    inst(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 14), M.dark, FT2, (o, q) => at(o, q[0], q[1], z3 + 0.75), G.detail, false);
    inst(new THREE.CylinderGeometry(0.05, 0.05, 0.72, 5), M.dark, FT2, (o, q) => at(o, q[0], q[1], z3 + 0.38), G.detail, false);
    inst(new THREE.BoxGeometry(0.45, 0.9, 0.45), M.wood, FT2.flatMap(q => [[q[0] - 0.85, q[1]], [q[0] + 0.85, q[1]]]), (o, q) => at(o, q[0], q[1], z3 + 0.45), G.detail, false);
    { const rp = rings[1][1], st = [];
      rp.forEach((p, i) => { const q = rp[(i + 1) % rp.length], L = Math.hypot(q[0] - p[0], q[1] - p[1]); for (let d = 3.5; d < L - 2; d += 7.5) { const t = d / L; st.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); } });
      inst(new THREE.BoxGeometry(1.9, 0.95, 1.0), M.white, st, (o, q) => { const nl = Math.hypot(q[0] - pv.x, q[1] - pv.y) || 1, nx = (q[0] - pv.x) / nl, ny = (q[1] - pv.y) / nl; at(o, q[0] - nx * 1.7, q[1] - ny * 1.7, z3 + 0.48); o.rotation.y = Math.atan2(-nx, ny); }, G.detail);
      inst(new THREE.BoxGeometry(1.9, 0.4, 0.07), M.tint, st, (o, q, i) => { const nl = Math.hypot(q[0] - pv.x, q[1] - pv.y) || 1, nx = (q[0] - pv.x) / nl, ny = (q[1] - pv.y) / nl; at(o, q[0] - nx * 2.18, q[1] - ny * 2.18, z3 + 0.68); o.rotation.y = Math.atan2(-nx, ny); return col(i % 3 === 2 ? ['#c2512f', '#2f5d50', '#d6b25a'][i % 3] : ['#efe9dc', '#e9e2d2', '#f4efe4'][i % 3]); }, G.detail, false); }
    // tall white columns rising past L3 to the roof trusses (ring inner edge) + arch columns
    const AR = C.hall_arches; const pc = [];
    if (rings[1]) rings[1][1].forEach((p, i) => { if (i % 6 === 0) pc.push([p[0] + (p[0] - pv.x) * 0.015, p[1] + (p[1] - pv.y) * 0.015]); });
    if (AR) AR.xs.forEach(x => [-1, 1].forEach(sd => pc.push([x, pv.y + sd * AR.half])));
    inst(new THREE.BoxGeometry(0.8, 1, 0.8), M.white, pc, (o, q) => { const zt = roofZ(q[0], q[1]) - 2.6; at(o, q[0], q[1], zt / 2); o.scale.y = zt; }, G.core);
    // glulam tied arches spanning across the hall
    if (AR) { const Ra = (AR.half * AR.half + (AR.crown - AR.spring) ** 2) / (2 * (AR.crown - AR.spring)), zc = AR.crown - Ra, ang = Math.asin(AR.half / Ra);
      const sh = new THREE.Shape(); const N = 30, ro = Ra + 0.55, ri = Ra - 0.55;
      for (let j = 0; j <= N; j++) { const a = -ang + 2 * ang * j / N; const v = [ro * Math.sin(a), zc + ro * Math.cos(a)]; j ? sh.lineTo(v[0], v[1]) : sh.moveTo(v[0], v[1]); }
      for (let j = N; j >= 0; j--) { const a = -ang + 2 * ang * j / N; sh.lineTo(ri * Math.sin(a), zc + ri * Math.cos(a)); }
      const ag = new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false, curveSegments: 1 }); ag.translate(0, 0, -0.35); // shape x = across hall (site y)
      inst(ag, M.glulam, AR.xs, (o, x) => { at(o, x, pv.y, 0); o.rotation.y=Math.PI/2; }, G.vault);
      inst(new THREE.BoxGeometry(1, 0.12, 0.12), M.ribSteel, AR.xs, (o, x) => { at(o, x, pv.y, AR.spring); o.rotation.y=Math.PI/2; o.scale.x = 2 * AR.half; }, G.vault, false);
      const hang = []; AR.xs.forEach(x => { for (let k = -3; k <= 3; k++) { const y = pv.y + k * AR.half / 4, d = y - pv.y; hang.push([x, y, zc + Math.sqrt(Ra * Ra - d * d) - 0.55]); } });
      inst(new THREE.BoxGeometry(0.05, 1, 0.05), M.ribSteel, hang, (o, q) => { at(o, q[0], q[1], (q[2] + AR.spring) / 2); o.scale.y = Math.max(0.1, q[2] - AR.spring); }, G.vault, false); }
    // white steel space trusses that FOLLOW the roof slopes (top chord 0.8 m, bottom chord 2.8 m below the glass)
    const fr = C.hall_frame || [], chords = [], diag = [], vert = [], spots = [];
    fr.forEach((l, li) => { const L = Math.hypot(l[1][0] - l[0][0], l[1][1] - l[0][1]), n = Math.max(2, Math.round(L / 2.6));
      for (let k = 0; k < n; k++) { const a = [l[0][0] + (l[1][0] - l[0][0]) * k / n, l[0][1] + (l[1][1] - l[0][1]) * k / n], b = [l[0][0] + (l[1][0] - l[0][0]) * (k + 1) / n, l[0][1] + (l[1][1] - l[0][1]) * (k + 1) / n];
        const za = roofZ(a[0], a[1]), zb = roofZ(b[0], b[1]);
        chords.push([a, za - 0.8, b, zb - 0.8]); chords.push([a, za - 2.8, b, zb - 2.8]); diag.push(k % 2 ? [a, za - 0.8, b, zb - 2.8] : [a, za - 2.8, b, zb - 0.8]);
        vert.push([a, za - 0.8, a, za - 2.8]);
        if (li % 2 === 0 && k % 2 === 1) spots.push([a[0], a[1], za - 3.4]); } });
    const seg = (o, q) => { const a = W(q[0][0], q[0][1], q[1]), b = W(q[2][0], q[2][1], q[3]); o.position.copy(a).add(b).multiplyScalar(0.5); o.lookAt(b); o.rotateY(Math.PI / 2); o.scale.x = a.distanceTo(b); };
    inst(new THREE.BoxGeometry(1, 0.3, 0.3), M.ribSteel, chords, seg, G.vault, false);
    inst(new THREE.BoxGeometry(1, 0.16, 0.16), M.ribSteel, diag, seg, G.vault, false);
    inst(new THREE.BoxGeometry(1, 0.14, 0.14), M.ribSteel, vert, seg, G.vault, false);
    inst(new THREE.CylinderGeometry(0.22, 0.3, 0.55, 8), M.glow, spots, (o, q) => at(o, q[0], q[1], q[2]), G.vault, false);
    // slatted timber 'LC' chandelier over the rink (ref9 k5/k7)
    { const cx = pv.x, cy = pv.y, hxs = 6.0, hys = 1.2, zb = 15.0, zt = 23.0, sl = [];
      for (let y = cy - hys; y <= cy + hys + 0.01; y += 0.45) { sl.push([cx - hxs, y]); sl.push([cx + hxs, y]); }
      for (let x = cx - hxs + 0.45; x < cx + hxs - 0.3; x += 0.45) { sl.push([x, cy - hys]); sl.push([x, cy + hys]); }
      inst(new THREE.BoxGeometry(0.09, zt - zb, 0.3), M.glulam, sl, (o, q) => at(o, q[0], q[1], (zb + zt) / 2), G.core, false);
      [[zt - 0.06], [zb + 0.06]].forEach(fz => { const fr2 = new THREE.Mesh(new THREE.BoxGeometry(2 * hxs, 0.12, 2 * hys), M.glulam); fr2.position.copy(W(cx, cy, fz[0])); G.core.add(fr2); });
      const c = env.canvas(256, 256), t = c.getContext('2d'); t.clearRect(0, 0, 256, 256); t.fillStyle = 'rgba(0,0,0,0)'; t.fillRect(0, 0, 256, 256);
      t.strokeStyle = '#f4f1ea'; t.fillStyle = '#f4f1ea'; t.lineWidth = 14; t.font = '700 175px Helvetica, Arial, sans-serif'; t.textAlign = 'center'; t.textBaseline = 'middle'; t.fillText('LC', 128, 132);
      const lm = std({ map: new THREE.CanvasTexture(c), transparent: true, roughness: 0.6, emissive: 0x30302a, side: THREE.DoubleSide });
      [-1, 1].forEach(sd => { const p = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), lm); p.position.copy(W(cx + sd * (hxs + 0.25), cy, (zb + zt) / 2 + 0.5)); p.rotation.y = sd * Math.PI / 2; G.core.add(p); });
      inst(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), M.dark, [[cx - hxs, cy - hys], [cx + hxs, cy - hys], [cx - hxs, cy + hys], [cx + hxs, cy + hys]], (o, q) => { at(o, q[0], q[1], (zt + roofZ(q[0], q[1]) - 2.8) / 2); o.scale.y = roofZ(q[0], q[1]) - 2.8 - zt; }, G.core, false);
      inst(new THREE.SphereGeometry(0.35, 8, 6), M.glow, [[cx - 2, cy - 4], [cx + 2, cy + 4], [cx, cy], [cx - 2, cy + 4], [cx + 2, cy - 4]], (o, q) => at(o, q[0], q[1], zb - 1.2), G.core, false); }
    // vertical 'Lloyd Commons' timber blade (ref8/k1)
    { const c = env.canvas(256, 512), t = c.getContext('2d'); for (let x = 0; x < 256; x += 12) { t.fillStyle = jitter([196, 120, 70], 30); t.fillRect(x, 0, 10, 512); t.fillStyle = 'rgba(60,30,14,0.6)'; t.fillRect(x + 10, 0, 2, 512); }
      t.fillStyle = '#fbf3e4'; t.font = '600 64px Helvetica, Arial, sans-serif'; t.textAlign = 'center'; t.save(); t.translate(128, 256); t.rotate(-Math.PI / 2); t.fillText('Lloyd Commons', 0, 22); t.restore();
      const sign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 10, 3.8), std({ map: new THREE.CanvasTexture(c), roughness: 0.7 })); sign.position.copy(W(pv.x - pv.hx + 9, pv.y + pv.hy - 9, 17)); sign.rotation.y = 0.6; sign.castShadow = true; G.core.add(sign); }
    // escalators ground -> L2 (glass sides, dark steps)
    (C.escalators || []).forEach(e => { const a = W(e[0], e[1], e[3]), b = W(e[2], e[1], e[4]), L = a.distanceTo(b);
      const tr = new THREE.Mesh(new THREE.BoxGeometry(L, 0.5, 1.4), M.dark); tr.position.copy(a).add(b).multiplyScalar(0.5); tr.lookAt(b); tr.rotateY(Math.PI / 2); G.core.add(tr);
      [-0.75, 0.75].forEach(o => { const gp = new THREE.Mesh(new THREE.BoxGeometry(L, 1.0, 0.05), M.glassRail); gp.position.copy(W((e[0] + e[2]) / 2, e[1] + o, (e[3] + e[4]) / 2 + 0.7)); gp.rotation.z = (e[2] > e[0] ? 1 : -1) * Math.atan2(e[4] - e[3], Math.abs(e[2] - e[0])); G.core.add(gp); }); });
  }
  // ------------------------------------------------------------ roof commons park (middle of galleria, on podium roofs)
  const PZ = POD + 0.3, RP = LY.park;
  if (!C.liners) C.park.forEach(f => { const g = new Geo(); let s = g.mark(); walls(g, f, POD, PZ + 0.45, 4, 4, 0); g.group(s, 0); s = g.mark(); cap(g, f, PZ, 5); g.group(s, 1); mesh(g.build(), [M.coping, M.paver], G.roofpark, false); });
  RP.walks.forEach(w => mesh(strip(w, 3.4, 4, PZ + 0.05), M.paver, G.roofpark, false));
  inst(new THREE.BoxGeometry(2, 0.7, 2), M.wood, RP.beds.filter((_, i) => i % 3 === 0), (o, q) => { at(o, q.x, q.y, PZ + 0.35); o.scale.set(q.rx * 0.5, 1, 0.6); }, G.roofpark);
  const pip = (pt, fp) => { let c = false; for (let i = 0, j = fp.length - 1; i < fp.length; j = i++) { const a = fp[i], b = fp[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const shrubs = [], beds2 = [];
  (C.liners ? [] : C.park).forEach(f => { const xs = f.map(p => p[0]), ys = f.map(p => p[1]), cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    for (let x = Math.min(...xs) + 4; x < Math.max(...xs) - 4; x += 11) for (let y = Math.min(...ys) + 3; y < Math.max(...ys) - 3; y += 7) {
      const px = x + (rnd() - 0.5) * 5, py = y + (rnd() - 0.5) * 3; if (Math.abs(py - cy) < 3.2 || !pip([px, py], f) || rnd() < 0.3) continue;
      const rx = 2.5 + rnd() * 3, ry = 1.6 + rnd() * 1.6; beds2.push([px, py, rx, ry]);
      const n = 3 + (rnd() * 5 | 0); for (let k = 0; k < n; k++) shrubs.push([px + (rnd() - 0.5) * rx * 1.4, py + (rnd() - 0.5) * ry * 1.3, 0.5 + rnd() * 0.8]); } });
  inst(new THREE.CylinderGeometry(1, 1, 0.3, 16), M.lawn, beds2, (o, q) => { at(o, q[0], q[1], PZ + 0.15); o.scale.set(q[2], 1, q[3]); }, G.roofpark, false);
  inst(new THREE.IcosahedronGeometry(1, 1), M.tint, shrubs, (o, q) => { at(o, q[0], q[1], PZ + 0.45 + q[2] * 0.5); o.scale.set(q[2], q[2] * 0.75, q[2]); return col(['#4f6e34', '#617f3e', '#7a8f45', '#3f5a2e', '#8a9a52', '#a08f4c'][(rnd() * 6) | 0]); }, G.roofpark);
  if (false) inst(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.tint, RP.beds, (o, q) => { at(o, q.x, q.y, PZ + 0.7); o.scale.set(q.rx * 0.92, 0.9, q.ry * 0.88); return col(['#8a5a8c', '#c9a04a', '#7f9a4e', '#b8577a', '#d0b468'][(q.x * 7 | 0) % 5]); }, G.roofpark);
  const pgPosts = [], pgSl = [];
  RP.pergolas.forEach(p => { [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(c => pgPosts.push([p.x + c[0] * p.w / 2, p.y + c[1] * p.d / 2])); for (let k = -4; k <= 4; k++) pgSl.push([p.x + k * p.w / 9, p.y, p.d]); });
  inst(new THREE.BoxGeometry(0.22, 2.8, 0.22), M.wood, pgPosts, (o, q) => at(o, q[0], q[1], PZ + 1.4), G.roofpark);
  inst(new THREE.BoxGeometry(0.16, 0.3, 1), M.wood, pgSl, (o, q) => { at(o, q[0], q[1], PZ + 2.9); o.scale.z = q[2] + 1; }, G.roofpark);
  RP.pods.forEach(p => { const pg = new THREE.CylinderGeometry(p.r, p.r, p.l, 18, 1, true, 0, Math.PI); pg.rotateZ(Math.PI / 2); const m = new THREE.Mesh(pg, M.glass); m.position.copy(W(p.x, p.y, PZ)); m.rotation.y = 0; G.roofpark.add(m); });
  inst(new THREE.CylinderGeometry(0.06, 0.08, 4.2, 6), M.dark, RP.posts, (o, q) => at(o, q[0], q[1], PZ + 2.1), G.roofpark, false);
  inst(new THREE.SphereGeometry(0.13, 6, 5), M.glow, RP.bulbs, (o, q) => at(o, q[0], q[1], PZ + q[2]), G.roofpark, false);
  inst(new THREE.BoxGeometry(2.0, 0.45, 0.6), M.wood, RP.benches, (o, q) => at(o, q.x, q.y, PZ + 0.23), G.roofpark);
  // glass guard where the park meets the vault
  const guard = C.guards || [];
  inst(new THREE.BoxGeometry(1, 1.1, 0.05), M.glassRail, guard, (o, q) => { at(o, (q[0] + q[1]) / 2, q[2], PZ + 0.55); o.scale.x = q[1] - q[0]; }, G.roofpark, false);

  // ------------------------------------------------------------ music venue (west terminus)
  const VN = LY.venue, VM = { venueBase: M.venueBase, darkPanel: M.darkPanel, copper: M.copper, glassBox: M.glassBox };
  M.venueRoof = M.venueRoof || std({ color: 0x3f4347, roughness: 0.92 });
  VN.vols.forEach(v => { const m = prism(v.fp, v.z0, Math.min(v.h, 21.5), VM[v.mat] || M.darkPanel, M.venueRoof, G.venue, v.mat === 'venueBase' ? 7 : 4, v.mat === 'venueBase' ? 9 : 4, v.z0); m.userData = { name: 'Music Venue (AEG / Monqui) — west terminus of the galleria', fl: 4, h: 28, prog: { resi: 0, off: 0, ret: 1 }, fp: VN.foot, units: 0 }; pick.push(m);
    if (v.z0 > 0) { const g = new Geo(); cap(g, v.fp, v.z0 + 0.02, 4, null, true); mesh(g.build(), M.darkPanel, G.venue); } });
  { const t = VN.terrace; flat(t, VN.terrace_z + 0.05, M.wood, G.venue, 3); const xs = t.map(p => p[0]); const umb = []; for (let x = Math.min(...xs) + 3; x < Math.max(...xs) - 2; x += 5) umb.push([x, t.reduce((s,p)=>s+p[1],0)/t.length]); inst(new THREE.ConeGeometry(1.5, 0.5, 10), M.tent, umb, (o, q) => at(o, q[0], q[1], VN.terrace_z + 2.4), G.venue); }
  { const cn = prism(VN.canopy, VN.canopy_z, VN.canopy_z + 0.6, M.copper, M.copper, G.venue, 3, 3, 0); const g = new Geo(); cap(g, VN.canopy, VN.canopy_z, 3, null, true); mesh(g.build(), M.glow, G.venue, false); }

  // ------------------------------------------------------------ fountain plaza (SW)
  const PL = LY.plaza;
  const pd = new THREE.Mesh(new THREE.CircleGeometry(PL.r, 96), M.plaza); pd.rotation.x = -Math.PI / 2; pd.position.copy(W(PL.x, PL.y, 0.07)); pd.receiveShadow = true; G.plaza.add(pd);
  const bw = new THREE.Mesh(new THREE.CylinderGeometry(11.4, 11.6, 0.7, 72, 1, true), M.coping); bw.position.copy(W(PL.x, PL.y, 0.3)); G.plaza.add(bw);
  const bt = new THREE.Mesh(new THREE.RingGeometry(10.8, 11.6, 72), M.coping); bt.rotation.x = -Math.PI / 2; bt.position.copy(W(PL.x, PL.y, 0.72)); G.plaza.add(bt);
  const wt = new THREE.Mesh(new THREE.CircleGeometry(10.85, 72), M.water); wt.rotation.x = -Math.PI / 2; wt.position.copy(W(PL.x, PL.y, 0.42)); G.plaza.add(wt);
  const jets = []; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; jets.push([PL.x + 5.5 * Math.cos(a), PL.y + 5.5 * Math.sin(a), 1.2 + (k % 2) * 0.5]); } jets.push([PL.x, PL.y, 8.5]); jets.push([PL.x, PL.y, 6.0]);
  inst(new THREE.CylinderGeometry(0.05, 0.28, 1, 8, 1, true), M.jet, jets, (o, q) => { at(o, q[0], q[1], 0.42 + q[2] / 2); o.scale.y = q[2]; }, G.plaza, false);
  { const rr = new THREE.Mesh(new THREE.RingGeometry(11.6, 14.2, 72), M.brickPave); rr.rotation.x = -Math.PI / 2; rr.position.copy(W(PL.x, PL.y, 0.09)); rr.receiveShadow = true; G.plaza.add(rr); }
  { const arcs = [[[PL.x + 14, PL.y + 6], [PL.x + 22, PL.y + 18], [PL.x + 18, PL.y + 32], [PL.x + 8, PL.y + 44], [PL.x + 4, PL.y + 52]], [[PL.x - 13, PL.y + 8], [PL.x - 20, PL.y + 20], [PL.x - 14, PL.y + 30], [PL.x - 8, PL.y + 36]]];
    const smooth = a => { const c = new THREE.CatmullRomCurve3(a.map(p => new THREE.Vector3(p[0], p[1], 0)), false, 'centripetal'); return c.getPoints(60).map(v => [v.x, v.y]); };
    arcs.forEach(a => { const sp = smooth(a); mesh(strip(sp, 2.2, 4, 0.1), M.brickPave, G.plaza, false); mesh(strip(sp, 0.35, 4, 0.11), M.darkPanel, G.plaza, false); });
    // planting islands with low shrubs (ref: lawn/shrub lozenges flanking the brick sweeps)
    const isl = [[PL.x - 21, PL.y + 4, 5.5, 3.6, 0.6], [PL.x + 20, PL.y + 26, 4.2, 3.0, -0.4], [PL.x - 4, PL.y + 30, 3.6, 2.6, 0.2]];
    isl.forEach(q => { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.45, 28), M.lawn); m.position.copy(W(q[0], q[1], 0.22)); m.scale.set(q[2], 1, q[3]); m.rotation.y = q[4]; m.receiveShadow = true; G.plaza.add(m);
      const sh = []; for (let k = 0; k < 9; k++) { const t = rnd() * 6.283, r = Math.sqrt(rnd()) * 0.75; sh.push([q[0] + Math.cos(t) * r * q[2], q[1] + Math.sin(t) * r * q[3], 0.6 + rnd() * 0.7]); }
      inst(new THREE.IcosahedronGeometry(1, 1), M.tint, sh, (o, p) => { at(o, p[0], p[1], 0.45 + p[2] * 0.5); o.scale.set(p[2], p[2] * 0.75, p[2]); return col(['#3f6128', '#4b6f2e', '#577c34', '#6b7d34'][(rnd() * 4) | 0]); }, G.plaza); }); }
  const seats = []; for (let k = 0; k < 20; k++) { if (k % 5 === 0) continue; const a = (k + 0.5) / 20 * 6.283; seats.push([PL.x + 22 * Math.cos(a), PL.y + 22 * Math.sin(a), a]); }
  inst(new THREE.BoxGeometry(6.4, 0.5, 0.9), M.coping, seats, (o, q) => { at(o, q[0], q[1], 0.25); o.rotation.y = q[2] + Math.PI / 2; }, G.plaza);

  // ------------------------------------------------------------ street furniture
  const F = LY.furniture;
  inst(new THREE.CylinderGeometry(0.45, 0.45, 0.75, 10), M.white, F.cafe, (o, q) => at(o, q[0], q[1], 0.38), G.detail);
  inst(new THREE.ConeGeometry(1.6, 0.6, 10), M.cloth, F.cafe, (o, q, i) => { at(o, q[0], q[1], 2.5); return col(['#f2ece0', '#c4603e', '#e8d3a6', '#2f5d50'][i % 4]); }, G.detail);
  inst(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 4), M.dark, F.cafe, (o, q) => at(o, q[0], q[1], 1.15), G.detail, false);
  inst(new THREE.BoxGeometry(1.9, 0.45, 0.6), M.wood, F.benches, (o, q) => { at(o, q[0], q[1], 0.23); o.rotation.y = q[2]; }, G.detail);
  inst(new THREE.CylinderGeometry(0.07, 0.1, 5.2, 6), M.dark, F.lamps, (o, q) => at(o, q[0], q[1], 2.6), G.detail, false);
  inst(new THREE.SphereGeometry(0.28, 8, 6), M.glow, F.lamps, (o, q) => at(o, q[0], q[1], 5.3), G.detail, false);
  inst(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 8), M.dark, F.bollards, (o, q) => at(o, q[0], q[1], 0.45), G.detail, false);
  inst(new THREE.TorusGeometry(0.4, 0.04, 4, 12, Math.PI), M.metal, F.racks, (o, q) => { at(o, q[0], q[1], 0.05); o.rotation.y = q[2]; }, G.detail, false);

  // ------------------------------------------------------------ trees (lumpy instanced crowns)
  const crownG = (() => { const parts = [[0, 0, 0, 1], [0.45, -0.15, 0.25, 0.72], [-0.4, -0.1, -0.3, 0.7], [0.05, 0.4, -0.05, 0.62], [-0.2, -0.2, 0.45, 0.6]].map(l => { const g = new THREE.IcosahedronGeometry(l[3], 1); g.translate(l[0], l[1], l[2]); return g; }); const pos = []; parts.forEach(g => { pos.push(...(g.index ? g.toNonIndexed() : g).attributes.position.array); }); const G2 = new THREE.BufferGeometry(); G2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); return G2; })();
  const _unused = new THREE.IcosahedronGeometry(1, 2); { const p = crownG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + 0.16 * Math.sin(x * 5.1 + y * 3.7) * Math.cos(z * 4.3 - x * 2.1) + 0.08 * Math.sin(y * 9 + z * 7); p.setXYZ(i, x * k, y * k * 0.86, z * k); } crownG.scale(0.78, 0.78, 0.78); crownG.computeVertexNormals(); }
  const TS = { atrium: [1.6, 2.2], street: [3.4, 5.0], esplanade: [3.0, 4.2], paseo: [2.6, 3.6], court: [3.4, 4.6], plaza: [3.0, 4.2], grove: [4.4, 5.6], deck: [2.0, 2.8] };
  const greens = ['#3f6128', '#4b6f2e', '#577c34', '#365424', '#628a3a', '#46682a'], autumn = ['#c98a32', '#b8662c', '#d2a440', '#9e4a28', '#c9b048', '#a8702e'];
  const treeList = [];
  Object.keys(LY.trees).forEach(k => LY.trees[k].forEach(q => { const s = TS[k][0] * (0.8 + rnd() * 0.45); treeList.push({ x: q[0], y: q[1], z: k === 'deck' ? PZ : k === 'atrium' ? 0.9 : 0, r: s, t: TS[k][1] * (0.85 + rnd() * 0.3), c: rnd() < 0.12 ? autumn[(rnd() * 6) | 0] : greens[(rnd() * 6) | 0], a: rnd() * 6.28, sq: 0.85 + rnd() * 0.3 }); }));
  inst(new THREE.CylinderGeometry(0.16, 0.26, 1, 6), M.wood, treeList, (o, q) => { at(o, q.x, q.y, q.z + q.t / 2); o.scale.y = q.t; }, G.trees);
  inst(crownG, M.tint, treeList, (o, q) => { at(o, q.x, q.y, q.z + q.t + q.r * 0.7); o.rotation.y = q.a; o.scale.set(q.r, q.r * q.sq, q.r * (1.05 - (q.sq - 1))); return col(q.c); }, G.trees);

  // ------------------------------------------------------------ surrounding road network, MAX stations, Holladay Park (LY.ctx_net)
  const ctxLo = new THREE.IcosahedronGeometry(1, 1);
  { const CN = LY.ctx_net;
    if (CN) {
      if(LY.road_surfaces){
        LY.road_surfaces.sidewalk.forEach(p=>flat(p.outer,0.14,M.walk,G.ctx,5,p.holes));
        LY.road_surfaces.asphalt.forEach(p=>flat(p.outer,0.095,M.asphalt,G.ctx,14,p.holes));
      }
      if(!LY.road_surfaces) (CN.streets || []).forEach((st, i) => {
        if (st.cls === 'motorway') { mesh(strip(st.pts, st.w, 20, 0.02 + i * 0.0004), M.asphalt, G.ctx, false); }
        else { mesh(strip(st.pts, st.w + 8.5, 5, 0.04), M.walk, G.ctx, false); mesh(strip(st.pts, st.w, 14, 0.09), M.asphalt, G.ctx, false); }
      });
      if(LY.road_detail){const d=LY.road_detail;
        const wear=std({color:0x777b7e,roughness:0.97});
        (d.collars||[]).forEach(()=>{}); // collars hidden: roads blank per user request (kept in data)
        (d.wear||[]).forEach(()=>{});
        const along=(o,q,z)=>{o.scale.x=boxAlong(o,q[0],q[1],z);};
        const paint=std({color:0xd7bd66,roughness:0.8});
        // OSM-lane-tag markings (road_marks.py): yellow separates opposing traffic, white dashes same-direction lanes,
        // solid white = bike lane line, stop bars on signal approaches. 10 cm lines, 3 m dash / 9 m gap.
        const yel=std({color:0xe0b84a,roughness:0.75}), wht=std({color:0xeeeeea,roughness:0.75});
        (d.yellow_solid||[]).forEach(p=>mesh(strip(p,0.11,8,0.106),yel,G.ctx,false));
        inst(new THREE.BoxGeometry(1,0.008,0.11),yel,d.yellow_dash||[],(o,q)=>along(o,q,0.106),G.ctx,false);
        inst(new THREE.BoxGeometry(1,0.008,0.11),wht,d.white_dash||[],(o,q)=>along(o,q,0.106),G.ctx,false);
        (d.white_solid||[]).forEach(p=>mesh(strip(p,0.15,8,0.106),wht,G.ctx,false));
        (d.stopbar||[]).forEach(p=>mesh(strip(p,0.45,8,0.107),wht,G.ctx,false));
        inst(new THREE.BoxGeometry(1,0.12,0.16),M.coping,d.curbs||[],(o,q)=>along(o,q,0.14),G.ctx,false);
      }
      // Circular asphalt junction caps bridge butt-ended segments at the same surface height.
      const caps=new Map();
      [...LY.streets,...(CN.streets||[])].filter(s=>!s.sw).forEach(s=>[s.pts[0],s.pts[s.pts.length-1]].forEach(p=>{const k=p.map(v=>Math.round(v*10)).join(',');const old=caps.get(k);if(!old||old.r<s.w/2)caps.set(k,{p,r:s.w/2});}));
      if(!LY.road_surfaces) caps.forEach(q=>{const o=new THREE.Mesh(new THREE.CircleGeometry(q.r,24),M.asphalt);o.rotation.x=-Math.PI/2;o.position.copy(W(q.p[0],q.p[1],0.092));G.ctx.add(o);});
      (CN.cars || []).forEach((c, i) => { const g = new Geo(); walls(g, [[-2.2, -0.9], [2.2, -0.9], [2.2, 0.9], [-2.2, 0.9]], 0.25, 0.95, 3, 3, 0); cap(g, [[-2.2, -0.9], [2.2, -0.9], [2.2, 0.9], [-2.2, 0.9]], 1.42, 3); const m = mesh(g.build(), [M.dark, M.tint], G.ctx); m.position.copy(W(c[0], c[1], 0)); m.rotation.y = c[2]; });
      inst(new THREE.BoxGeometry(1.7, 0.5, 4.3), M.dark, (CN.cars || []).map(c => [c[0], c[1], c[2]]), (o, q) => { at(o, q[0], q[1], 0.62); o.rotation.y = q[2]; }, G.ctx);
      // MAX: ballast + catenary poles
      (CN.catenary || []).forEach(q => { inst(new THREE.CylinderGeometry(0.09, 0.11, 7.2, 6), M.dark, [q], (o, p) => at(o, p[0], p[1], 3.6), G.ctx, false); inst(new THREE.BoxGeometry(9.2, 0.1, 0.12), M.dark, [q], (o, p) => { at(o, p[0], p[1], 6.9); o.rotation.y = Math.PI / 2; }, G.ctx, false); inst(new THREE.CylinderGeometry(0.03, 0.03, 1, 4), M.dark, [[q[0] - 4.6, q[1], q[0] + 4.6, q[1]]], (o, p) => { const a3 = W(p[0], p[1], 6.85), b3 = W(p[2], p[3], 6.95); o.position.copy(a3).add(b3).multiplyScalar(0.5); o.lookAt(b3); o.rotateY(Math.PI / 2); o.scale.y = a3.distanceTo(b3); }, G.ctx, false); });
      // stations: platform slabs, tactile edge, canopy on posts, shelters, benches
      (CN.stations || []).forEach(stn => {
        stn.plats.forEach(fp => {
          flat(fp, 0.42, M.walk, G.ctx, 6);
          const xs = fp.map(p => p[0]), ys = fp.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
          const side = Math.abs(stn.track_y - y0) < Math.abs(y1 - stn.track_y) ? y0 : y1;
          flat([[x0 + 0.4, side - 0.32], [x1 - 0.4, side - 0.32], [x1 - 0.4, side + 0.32], [x0 + 0.4, side + 0.32]], 0.47, M.brickPave, G.ctx, 3);
          const cp = [[x0 + 1.2, (y0 + y1) / 2], [x1 - 1.2, (y0 + y1) / 2]];
          inst(new THREE.CylinderGeometry(0.07, 0.07, 3.0, 6), M.ribSteel, [[cp[0], cp[1]]].flatMap(q => { const n2 = Math.max(2, Math.round(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) / 3.4)); return Array.from({ length: n2 + 1 }, (_, i) => [q[0][0] + (q[1][0] - q[0][0]) * i / n2, q[0][1] + (q[1][1] - q[0][1]) * i / n2]); }), (o, q) => at(o, q[0], q[1], 1.9), G.ctx, false);
          const g = new Geo(); const over = [[x0 + 1.0, y0 - 0.5], [x1 - 1.0, y0 - 0.5], [x1 - 1.0, y1 + 0.5], [x0 + 1.0, y1 + 0.5]];
          walls(g, over, 3.3, 3.55, 4, 4, 0); cap(g, over, 3.55, 4); mesh(g.build(), M.ribSteel, G.ctx);
          const shl = [[x0 + 2, (y0 + y1) / 2 - 0.85], [x0 + 4.6, (y0 + y1) / 2 + 0.85]];
          inst(new THREE.BoxGeometry(1, 2.3, 2.4), M.glass, shl, (o, q) => { at(o, q[0], q[1], 1.6); o.rotation.y = Math.PI / 2; o.scale.x = q[1] - q[0]; }, G.ctx, false);
          inst(new THREE.BoxGeometry(1.9, 0.45, 0.55), M.wood, [[(x0 + x1) / 2, (y0 + y1) / 2]], (o, q) => { at(o, q[0], q[1], 0.75); o.rotation.y = Math.PI / 2; }, G.ctx);
        });
        if (stn.x < 700) ctxLabel('MAX · NE 7th Ave', stn.x, stn.y + 18, 9);
      });
      // signalized corners on the ring (9th, 11th/curve, 7th) + ped signals
      (CN.signals || []).forEach(sg => {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        dirs.forEach(dv => { const px = sg[0] + dv[0] * 9.5, py = sg[1] + dv[1] * 9.5;
          inst(new THREE.CylinderGeometry(0.14, 0.16, 5.6, 8), M.dark, [[px, py]], (o, p) => at(o, p[0], p[1], 2.8), G.ctx, false);
          inst(new THREE.BoxGeometry(1, 0.12, 0.12), M.dark, [[px, py, px - dv[0] * 5.6, py - dv[1] * 5.6]], (o, p) => { o.scale.x = boxAlong(o, [p[0], p[1]], [p[2], p[3]], 5.2); }, G.ctx, false);
          const hx = px - dv[0] * 5.6, hy = py - dv[1] * 5.6;
          inst(new THREE.BoxGeometry(0.34, 0.85, 0.22), M.dark, [[hx, hy]], (o, p) => { at(o, p[0], p[1], 4.85); o.rotation.y = Math.atan2(-dv[1], dv[0]) + (Math.abs(dv[0]) > 0 ? (dv[0] > 0 ? Math.PI : 0) : (dv[1] > 0 ? Math.PI / 2 : -Math.PI / 2)); }, G.ctx, false);
          inst(new THREE.SphereGeometry(0.09, 6, 5), M.jet, [[hx, hy]], (o, p) => at(o, p[0], p[1] - 0.3, 4.85), G.ctx, false); });
      });
      // bus stops on Multnomah (site side): shelter + sign + bench
      (CN.busstops || []).forEach(bs => {
        const g2 = new Geo(); const over2 = [[bs[0] - 3.2, bs[1] - 1.4], [bs[0] + 3.2, bs[1] - 1.4], [bs[0] + 3.2, bs[1] + 1.4], [bs[0] - 3.2, bs[1] + 1.4]];
        const post2 = [[bs[0] - 2.9, bs[1] - 1.1], [bs[0] + 2.9, bs[1] - 1.1], [bs[0] - 2.9, bs[1] + 1.1], [bs[0] + 2.9, bs[1] + 1.1]];
        inst(new THREE.BoxGeometry(0.1, 2.5, 0.1), M.ribSteel, post2, (o, p) => at(o, p[0], p[1], 1.25), G.ctx, false);
        walls(g2, over2, 2.5, 2.65, 4, 4, 0); cap(g2, over2, 2.68, 4); mesh(g2.build(), M.ribSteel, G.ctx);
        inst(new THREE.BoxGeometry(5.6, 2.0, 0.06), M.glass, [[bs[0], bs[1] + 1.35]], (o, p) => { at(o, p[0], p[1], 1.35); }, G.ctx, false);
        inst(new THREE.BoxGeometry(4.6, 0.45, 0.55), M.wood, [[bs[0], bs[1] - 0.4]], (o, p) => at(o, p[0], p[1], 0.55), G.ctx);
        inst(new THREE.BoxGeometry(0.16, 2.6, 0.16), M.dark, [[bs[0] - 4.1, bs[1]]], (o, p) => at(o, p[0], p[1], 1.3), G.ctx, false);
        inst(new THREE.BoxGeometry(0.7, 0.5, 0.04), M.jet, [[bs[0] - 4.1, bs[1]]], (o, p) => { at(o, p[0], p[1], 2.4); }, G.ctx, false);
      });
      // Holladay Park
      { const P2 = CN.park;
        if (P2) {
          (P2.paths || []).forEach(p2 => mesh(strip(p2, 3.0, 5, 0.09), M.walk, G.ctx, false));
          const fx = P2.fountain[0], fy = P2.fountain[1];
          const fc = new THREE.Mesh(new THREE.CircleGeometry(8.6, 48), M.plaza); fc.rotation.x = -Math.PI / 2; fc.position.copy(W(fx, fy, 0.08)); G.ctx.add(fc);
          const bw = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.5, 0.55, 48, 1, true), M.coping); bw.position.copy(W(fx, fy, 0.27)); G.ctx.add(bw);
          const wt = new THREE.Mesh(new THREE.CircleGeometry(4.25, 36), M.water); wt.rotation.x = -Math.PI / 2; wt.position.copy(W(fx, fy, 0.4)); G.ctx.add(wt);
          const j2 = []; for (let k = 0; k < 12; k++) { const a2 = k / 12 * 6.283; j2.push([fx + 2.1 * Math.cos(a2), fy + 2.1 * Math.sin(a2), 1.6 + (k % 2) * 0.6]); } j2.push([fx, fy, 4.6]);
          inst(new THREE.CylinderGeometry(0.05, 0.22, 1, 8, 1, true), M.jet, j2, (o, q) => { at(o, q[0], q[1], 0.4 + q[2] / 2); o.scale.y = q[2]; }, G.ctx, false);
          const pg = P2.playground; const sand = new THREE.Mesh(new THREE.CircleGeometry(6.4, 32), std({ color: 0xd9c491, roughness: 1 })); sand.rotation.x = -Math.PI / 2; sand.position.copy(W(pg[0], pg[1], 0.07)); G.ctx.add(sand);
          inst(new THREE.BoxGeometry(1, 1, 1), M.tint, [[0, 0], [2.4, 1.4], [-2.2, 1.8], [1.2, -2.4]].map(q => [pg[0] + q[0], pg[1] + q[1]]), (o, q, i) => { at(o, q[0], q[1], 0.7 + (i % 2) * 0.5); o.scale.set(2.2 - i * 0.3, 1.4 + (i % 2), 1.4); return col(['#c2512f', '#2f5d50', '#d6b25a', '#3d4a66'][i]); }, G.ctx);
          inst(new THREE.BoxGeometry(1.9, 0.45, 0.55), M.wood, P2.benches, (o, q, i) => { const a2 = i * 2.1; at(o, q[0], q[1], 0.25); o.rotation.y = a2; }, G.ctx);
        }
      }
    }
  }

  { const CN2 = LY.ctx_net; if (CN2) { const p2 = CN2.park.trees.map(q => ({ x: q[0], y: q[1], r: 3.7 + rnd() * 1.6, t: 5.4 + rnd() * 2.0, c: rnd() < 0.14 ? autumn[(rnd() * 6) | 0] : greens[(rnd() * 6) | 0] }));
      const s2 = CN2.trees.map(q => ({ x: q[0], y: q[1], r: 3.6 + rnd() * 1.8, t: 5.0 + rnd() * 1.6, c: rnd() < 0.14 ? autumn[(rnd() * 6) | 0] : greens[(rnd() * 6) | 0] }));
      [p2, s2].forEach(list2 => { inst(new THREE.CylinderGeometry(0.22, 0.32, 1, 5), M.wood, list2, (o, q) => { at(o, q.x, q.y, q.t / 2); o.scale.y = q.t; }, G.ctx, false); inst(ctxLo, M.tint, list2, (o, q) => { at(o, q.x, q.y, q.t + q.r * 0.55); o.scale.set(q.r, q.r * 0.85, q.r); o.rotation.y = rnd() * 6; return col(q.c); }, G.ctx); }); } }
  { const lo = new THREE.IcosahedronGeometry(1, 1); const ct = ctxTrees.map(q => ({ x: q[0], y: q[1], r: 5.6 + rnd() * 3.2, t: 4.6 + rnd() * 2.2, c: rnd() < 0.14 ? autumn[(rnd() * 6) | 0] : greens[(rnd() * 6) | 0] }));
    inst(new THREE.CylinderGeometry(0.2, 0.3, 1, 5), M.wood, ct, (o, q) => { at(o, q.x, q.y, q.t / 2); o.scale.y = q.t; }, G.ctx, false);
    inst(lo, M.tint, ct, (o, q) => { at(o, q.x, q.y, q.t + q.r * 0.55); o.scale.set(q.r, q.r * 0.85, q.r); o.rotation.y = rnd() * 6; return col(q.c); }, G.ctx); }
  { const CN3 = LY.ctx_net; if (CN3) (CN3.labels || []).forEach(l => ctxLabel(l[0], l[1], l[2], l[3])); }
  // ------------------------------------------------------------ people
  const clothes = ['#2f3a48', '#5a6b8a', '#9a5240', '#d8d2c4', '#6b7a4a', '#7a4a5a', '#c9a24a', '#e8e4dc', '#3e5a6e', '#a03a2e'];
  inst(new THREE.CylinderGeometry(0.2, 0.16, 1.35, 6), M.cloth, LY.people, (o, q) => { at(o, q[0], q[1], (q[2] || 0) + 0.72); o.scale.setScalar(0.92 + rnd() * 0.16); return col(clothes[(rnd() * clothes.length) | 0]); }, G.people, false);
  inst(new THREE.SphereGeometry(0.13, 8, 6), M.cloth, LY.people, (o, q) => { at(o, q[0], q[1], (q[2] || 0) + 1.6); return col(['#e0bfa0', '#a87a58', '#6e4a32', '#d9a982'][(rnd() * 4) | 0]); }, G.people, false);

  // ------------------------------------------------------------ labels
  function ctxLabel(text, x, y, h) { const c = env.canvas(512, 96), t = c.getContext('2d'); t.font = '600 30px Helvetica, Arial, sans-serif'; const w = Math.min(500, (t.measureText ? t.measureText(text).width : 300) + 30);
    t.fillStyle = 'rgba(24,28,33,0.66)'; if (t.roundRect) { t.beginPath(); t.roundRect((512 - w) / 2, 22, w, 50, 10); t.fill(); } else t.fillRect((512 - w) / 2, 22, w, 50);
    t.fillStyle = '#e8e2d4'; t.textAlign = 'center'; t.textBaseline = 'middle'; t.fillText(text, 256, 48);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); sp.position.copy(W(x, y, h)); sp.scale.set(46, 8.6, 1); sp.renderOrder = 9; G.ctx.add(sp); }
  function label(text, x, y, h, s) {
    const c = env.canvas(512, 96), t = c.getContext('2d'); t.font = '600 34px Helvetica, Arial, sans-serif';
    const w = Math.min(500, (t.measureText ? t.measureText(text).width : 300) + 36);
    t.fillStyle = 'rgba(20,24,29,0.78)'; if (t.roundRect) { t.beginPath(); t.roundRect((512 - w) / 2, 18, w, 58, 12); t.fill(); } else t.fillRect((512 - w) / 2, 18, w, 58);
    t.fillStyle = '#f2ede2'; t.textAlign = 'center'; t.textBaseline = 'middle'; t.fillText(text, 256, 48);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false })); sp.position.copy(W(x, y, h)); sp.scale.set(64 * (s || 1), 12 * (s || 1), 1); sp.renderOrder = 10; G.labels.add(sp);
  }
  (LY.labels || []).forEach(l => label(l[0], l[1], l[2], l[3], l[4]));
  label('NE Halsey St', 860, 786, 6, 0.7); label('NE Multnomah St', 1000, 536, 6, 0.7); label('NE 9th Ave', 626, 660, 6, 0.7); label('Curved perimeter road', 1172, 740, 8, 0.7);

  // ------------------------------------------------------------ presets (site coords) + spatial audit
  const AW = (C.AXW || AX), AE = C.AXE || AX;
  const presets = {
    hero: { pos: [560, 470, 250], tgt: [915, 668, 0] },
    axis: { pos: [742, AW, 44], tgt: [1060, AE, 8] },
    aerial: { pos: [520, 400, 330], tgt: [880, 670, 0] },
    obl: { pos: [560, 455, 215], tgt: [880, 680, 20] },
    plaza: { pos: [668, 565, 8], tgt: [705, 581, 17] },
    fountainbuildings: {pos:[648,533,65],tgt:[735,590,17]},
    refaerial: { pos: [518.6,568.7,166.0],tgt:[827.3,635.7,0], fov:45.6 },
    entrance: {pos:[867,548,5],tgt:[867,600,10]},
    galleria: { pos: [C.VX0 + 6, AW - 3, 1.7], tgt: [RX - 50, AW, 7] },
    atrium: { pos: [C.VX0 + 4, AW, 12.5], tgt: [RX - C.pav.hx, AW, 7] },
    rink: { pos: [RX - 18, C.pav.y - 25, 1.7], tgt: [RX + 6, C.pav.y + 18, 14] },
    foodcourt: { pos: [RX - 14, C.pav.y - C.pav.hy + 4, 11.2], tgt: [RX + 6, C.pav.y + 14, 12] },
    hall: { pos: [RX + 175, AE - 20, 120], tgt: [RX - 60, AW, 8] },
    roofdetail: { pos: [RX+102,C.pav.y-87,100],tgt:[RX,C.pav.y,25] },
    roofreverse: { pos: [RX-102,C.pav.y+87,100],tgt:[RX,C.pav.y,25] },
    roofwalk: { pos: [RX - C.pav.hx - 78, AW + C.VH + 4.6, POD + 1.7], tgt: [RX - C.pav.hx - 20, AW + C.VH + 1, POD + 4.5] },
    dusk: { pos: [RX - C.pav.hx - 60, AW - C.VH - 6, POD + 9], tgt: [C.VX0 + 20, AW, 4] },
    roofpark: { pos: [RX - 116, AW - C.LE - 12, POD + 2.2], tgt: [RX - 20, AW - C.LE - 12, POD + 4] },
    east: { pos: [1300, 840, 150], tgt: [1020, 665, 30] },
    north: {pos:[850,875,145],tgt:[850,730,23]},
    roadsnorth:{pos:[875,870,430],tgt:[875,870,0]},
    routejunction:{pos:[1020,640.3,230],tgt:[1020,640,0]},
    routeobl:{pos:[1160,560,120],tgt:[1040,680,5]},
    sebay:{pos:[1150,520,70],tgt:[1075,585,18]},
    northrow:{pos:[860,620,150],tgt:[860,740,20]},
    northhalsey:{pos:[860,880,95],tgt:[860,735,25]},
    pyramidtop:{pos:[935,650.3,170],tgt:[935,650,0]},
    pyramidobl:{pos:[880,520,110],tgt:[925,650,18]},
    pyramidc1:{pos:[868,470,150],tgt:[915,640,15],fov:38},
    roads9mult:{pos:[633,541.3,140],tgt:[633,541,0]},
    roadsmult:{pos:[870,541.3,120],tgt:[870,541,0]},
    roadshalsey:{pos:[870,780.3,120],tgt:[870,780,0]},
    roadssouth:{pos:[910,460,300],tgt:[910,460,0]},
    park: { pos: [905, 430, 120], tgt: [905, 640, 20] },
    plan: { pos: [SITE.cx, SITE.cy - 1, 900], tgt: [SITE.cx, SITE.cy, 0] },
    max: { pos: [985, 296, 72], tgt: [826, 438, 0] },
    holladay: { pos: [846, 330, 96], tgt: [876, 615, 2] },
    wide: { pos: [430, 260, 480], tgt: [870, 620, 0] },
  };
  function audit() {
    root.updateMatrixWorld(true);
    const rows = [], tmp = new THREE.Matrix4(), v = new THREE.Vector3();
    const margin = { streets: 260, rails: 420, ctx: Infinity, ground: Infinity, labels: 30 };
    Object.keys(G).forEach(k => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, n = 0, out = 0; const mg = margin[k] !== undefined ? margin[k] : 18;
      const add = (p, cnt) => { const x = p.x, y = -p.z; n += cnt || 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); if (x < SITE.x0 - mg || x > SITE.x1 + mg || y < SITE.y0 - mg || y > SITE.y1 + mg) out++; };
      G[k].traverse(o => {
        if (o.isInstancedMesh) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); const c = o.geometry.boundingSphere.center; for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, tmp); v.copy(c).applyMatrix4(tmp).applyMatrix4(o.matrixWorld); add(v); } }
        else if (o.isMesh) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; v.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2).applyMatrix4(o.matrixWorld); add(v); }
        else if (o.isSprite) add(o.position);
      });
      if (!n) return;
      rows.push({ layer: k, n: n, out: out, x: [Math.round(x0), Math.round(x1)], y: [Math.round(y0), Math.round(y1)], pass: margin[k] === Infinity || out === 0 });
    });
    return { site: SITE, rows: rows, pass: rows.every(r => r.pass) };
  }
  return { root: root, groups: G, pick: pick, presets: presets, W: W, site: SITE, audit: audit, materials: M };
}
if (typeof module !== 'undefined') module.exports = buildCommons;
