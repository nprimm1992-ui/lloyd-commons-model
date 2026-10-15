window.LC_UI = function (X) {
  const { $, B } = X, fmt = n => Number(n).toLocaleString('en-US');
  const body = document.body, st = window.LAYOUT.stats;
  const REFS = window.REFS || [];
  const CH = [
    { k: 'Chapter 01', t: 'Aging mall to public realm', v: 'refaerial', d: 'Lloyd Commons keeps the civic core of the Lloyd Center standing and builds a new district around it: a glass galleria, a crossing hall over the ice rink, a roof commons park, and connected towers on the perimeter parcels. "Lloyd Commons value comes from layering, not flattening."' },
    { k: 'Chapter 02', t: 'Fountain plaza & the venue', v: 'plazaref', d: 'The west terminus opens onto a round fountain plaza framed by terracotta paths. The AEG / Monqui music venue, 68,000 sq ft and opening Q1 2027, anchors the corner. Retention lets it open inside a reactivated civic core instead of a prolonged construction zone.' },
    { k: 'Chapter 03', t: 'The Commons spine', v: 'spine', d: 'Layer 1, street level: pedestrian promenades, retail frontages, bike lanes and transit stops, with the street grid reconnected. A single straight route runs east to west, and the north–south lanes at 10th and the Pyramid lane link it back to NE Halsey.' },
    { k: 'Chapter 04', t: 'Twin glass vaults', v: 'vaults', d: 'Layer 2, the indoor civic promenade. A path through the civic core is held open as a permanent public right of way: "a street that never closes." It hosts a year-round market street, makers, food stalls and events. That matters in a city of 164 rainy days.' },
    { k: 'Chapter 05', t: 'The crossing hall', v: 'hallroof', d: 'The two vaults meet under a low, faceted octagonal roof over the Lloyd Center Ice Rink, "a community touchstone and vital regional amenity." The hall is also a designated climate refuge: a warming and cooling centre during extreme weather.' },
    { k: 'Chapter 06', t: 'Roof commons & farm', v: 'roofcommons', d: 'Layer 3, the elevated park: gardens, terraces, greenhouse pods, solar canopies, bioswales and event space. You reach it from the civic promenade and from the towers via sky lobbies, bridges and balconies. "Residents look down onto the park. Workers step out onto the garden."' },
    { k: 'Chapter 07', t: 'Connected towers, one district', v: 'context', d: 'Layer 4: mixed-use mid-rise and high-rise blocks from the ZGF framework sit on the perimeter parcels, with direct access to the roof commons. MAX Blue and Red lines, the Streetcar A/B loops and four bus corridors make it one of Portland\'s most transit-served sites.' },
  ];
  let mode = 'hero', ch = 0, panel = null, cmp = 0;

  // ------------------------------------------------------------ helpers
  const show = (id, on) => { const e = $(id); if (e) e.classList.toggle('on', !!on); };
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), 2400); }
  function setPanel(p) { panel = panel === p ? null : p; ['sun', 'data', 'layers'].forEach(k => { show('panel-' + k, panel === k); const b = $('tb-' + k); if (b) b.classList.toggle('active', panel === k); }); }
  function setActive() { ['tour', 'explore', 'walk', 'compare'].forEach(k => { const b = $('tb-' + k); if (b) b.classList.toggle('active', mode === k); }); }

  // ------------------------------------------------------------ modes
  function enter(m, instant) {
    if (mode === 'compare' && m !== 'compare') { X.setFrame(0); show('compare-ui', false); body.classList.remove('comparing'); }
    if (mode === 'walk' && m !== 'walk') { const w = X.walkState(); if (w) w.play = false; X.setWalk(null); show('walk-ui', false); }
    mode = m; X.stopOrbit(); body.classList.remove('hero-on'); show('hero', false); show('chrome', true);
    show('tour-card', m === 'tour');
    if (m === 'tour') { goChapter(ch, instant); }
    if (m === 'walk') { X.setWalk({ t: 0, play: true }); X.walkAt(0); show('walk-ui', true); $('walkPlay').textContent = 'Pause'; }
    if (m === 'compare') { show('compare-ui', true); body.classList.add('comparing'); setCompare(cmp); }
    setActive(); X.dirty();
  }
  function goChapter(i, instant) {
    ch = (i + CH.length) % CH.length; const c = CH[ch];
    $('tour-k').textContent = c.k + ' / 0' + CH.length; $('tour-t').textContent = c.t; $('tour-d').textContent = c.d;
    const card = $('tour-card'); card.classList.remove('reveal'); void card.offsetWidth; card.classList.add('reveal');
    $('tour-dots').innerHTML = CH.map((_, j) => '<button data-testid="tour-dot-' + j + '" class="dot' + (j === ch ? ' on' : '') + '" data-ch="' + j + '" aria-label="Chapter ' + (j + 1) + '"></button>').join('');
    $('tour-dots').querySelectorAll('button').forEach(b => b.onclick = () => goChapter(+b.dataset.ch));
    X.flyTo(c.v, instant ? 0 : 3600);
  }

  // ------------------------------------------------------------ compare (rendering vs live model at the solved camera)
  function setCompare(i) {
    if (!REFS.length) return; cmp = (i + REFS.length) % REFS.length; const r = REFS[cmp];
    $('cmp-img').src = r.src; $('cmp-title').textContent = r.title; $('cmp-note').textContent = r.note || '';
    document.querySelectorAll('#cmp-tabs button').forEach((b, j) => b.classList.toggle('on', j === cmp));
    X.setFrame(r.aspect); X.flyTo(r.view, 0); applyMix();
  }
  function applyMix() {
    const v = +$('cmp-mix').value / 100, img = $('cmp-img'), sw = $('cmp-mode').dataset.m === 'swipe';
    if (sw) { img.style.opacity = 1; img.style.clipPath = 'inset(0 ' + ((1 - v) * 100) + '% 0 0)'; $('cmp-line').style.left = (v * 100) + '%'; $('cmp-line').style.display = 'block'; }
    else { img.style.clipPath = 'none'; img.style.opacity = v; $('cmp-line').style.display = 'none'; }
    $('cmp-mix-l').textContent = sw ? 'Swipe' : (v < 0.02 ? 'Live model' : v > 0.98 ? 'Rendering' : Math.round(v * 100) + '% rendering');
  }

  // ------------------------------------------------------------ share + capture
  function shareURL() {
    const p = X.pose(), r = n => Math.round(n * 10) / 10;
    return location.origin + location.pathname + '#cam=' + [...p.pos, ...p.tgt, p.fov].map(r).join(',') + '&sun=' + X.SUN.doy + ',' + r(X.SUN.hour);
  }
  async function share() { const u = shareURL(); history.replaceState(null, '', u); try { await navigator.clipboard.writeText(u); toast('Link to this view copied'); } catch (e) { toast('Link ready in the address bar'); } }
  function capture() {
    const R = X.renderer, pr = R.getPixelRatio(), w = R.domElement.clientWidth, h = R.domElement.clientHeight, k = Math.min(3, 3840 / w) ;
    toast('Rendering high-resolution still…');
    setTimeout(() => {
      R.setPixelRatio(k); R.setSize(w, h); if (X.composer) X.composer.setSize(w, h);
      X.draw(true); const url = R.domElement.toDataURL('image/png');
      R.setPixelRatio(pr); R.setSize(w, h); if (X.composer) X.composer.setSize(w, h); X.dirty();
      const a = document.createElement('a'); a.href = url; a.download = 'lloyd-commons-' + new Date().toISOString().slice(0, 10) + '.png'; a.click();
      toast('Still saved · ' + Math.round(w * k) + ' × ' + Math.round(h * k) + ' px');
    }, 60);
  }

  // ------------------------------------------------------------ data panel
  $('metrics').innerHTML = [
    ['FAR', st.far, 'floor-area ratio'], ['Homes', '≈ ' + fmt(st.units), '85 m² average'], ['Buildings', st.n_buildings, fmt(window.LAYOUT.buildings.length) + ' massing records'],
    ['Site', st.site_ac + ' ac', fmt(st.site_m2) + ' m²'], ['Total GFA', fmt(Math.round(st.total_gfa_m2 / 1000)) + 'k m²', fmt(st.office_m2) + ' m² office'], ['Retained core', fmt(Math.round(st.core_gla_sf / 1000)) + 'k SF', '3 levels, kept standing'],
    ['Roof commons', fmt(st.park_m2) + ' m²', 'park on podium roofs'], ['Open ground', st.ground_open_pct + '%', 'of the site'], ['Height cap', st.max_fl + ' fl', 'tallest tower'],
  ].map((r, i) => '<div class="met" data-testid="metric-' + i + '"><div class="mv">' + r[1] + '</div><div class="mk">' + r[0] + '</div><div class="ms">' + r[2] + '</div></div>').join('');

  $('hero-meta').innerHTML = [st.site_ac + ' ac', 'FAR ' + st.far, '≈ ' + fmt(Math.round(st.units / 10) * 10) + ' homes', st.max_fl + '-floor cap'].map(t => '<span>' + t + '</span>').join('');
  // ------------------------------------------------------------ info card
  function showInfo(u) {
    const p = u.prog || { resi: 0, off: 0, ret: 0 }, pc = v => Math.round(v * 100);
    $('info').innerHTML = '<button class="x" id="info-close" data-testid="info-close-btn" aria-label="Close">×</button><div class="ik">Building</div><div class="it" data-testid="info-name">' + u.name + '</div>' +
      '<div class="ig"><div><b data-testid="info-floors">' + u.fl + '</b><span>floors</span></div><div><b data-testid="info-height">' + (+u.h).toFixed(1) + ' m</b><span>height</span></div><div><b>' + (u.units ? '≈ ' + fmt(u.units) : '—') + '</b><span>homes</span></div></div>' +
      '<div class="bar"><i style="width:' + pc(p.resi) + '%;background:var(--precast)"></i><i style="width:' + pc(p.off) + '%;background:var(--bronze)"></i><i style="width:' + pc(p.ret) + '%;background:var(--timber)"></i></div>' +
      '<div class="lg"><span><i style="background:var(--precast)"></i>Residential ' + pc(p.resi) + '%</span><span><i style="background:var(--bronze)"></i>Office ' + pc(p.off) + '%</span><span><i style="background:var(--timber)"></i>Retail ' + pc(p.ret) + '%</span></div>';
    show('info', true); $('info-close').onclick = hideInfo;
  }
  function hideInfo() { show('info', false); }

  // ------------------------------------------------------------ wiring
  const on = (id, f) => { const e = $(id); if (e) e.onclick = f; };
  on('hero-tour', () => enter('tour')); on('hero-explore', () => enter('explore'));
  on('tb-tour', () => enter('tour')); on('tb-explore', () => { enter('explore'); }); on('tb-walk', () => enter('walk')); on('tb-compare', () => enter('compare'));
  on('tb-sun', () => setPanel('sun')); on('tb-data', () => setPanel('data')); on('tb-layers', () => setPanel('layers'));
  on('tb-share', share); on('tb-capture', capture); on('tb-photo', () => photoOpen());
  // ------------------------------------------------------------ photo mode (darkroom overlay with progress ring)
  const PH = $('photo'), ring = $('ph-ring'), RC = 2 * Math.PI * 52;
  function photoOpen() { if (!X.photo || X.photo.busy()) return; hideInfo(); setPanel(null); PH.className = 'on setup'; $('ph-tilt').checked = false;
    const T = X.T; $('ph-spec').textContent = 'Up to ' + T.photoMax + ' px · ' + T.samples + ' refinement passes · ' + (X.TIER === 'mobile' ? 'phone' : X.TIER) + ' quality'; }
  function photoGo() { PH.className = 'on running'; ring.style.strokeDashoffset = RC; $('ph-pct').textContent = '0%'; $('ph-msg').textContent = 'Developing the still…';
    X.photo.start({ tilt: $('ph-tilt').checked, onProgress: (f, i, n) => { ring.style.strokeDashoffset = RC * (1 - f); $('ph-pct').textContent = Math.round(f * 100) + '%'; $('ph-msg').textContent = 'Pass ' + i + ' of ' + n + ' · soft shadows, occlusion, reflections'; },
      onDone: r => { if (!r) { PH.className = ''; toast('Photo cancelled'); return; } PH.className = 'on done'; $('ph-img').src = r.url; const a = $('ph-dl'); a.href = r.url; a.download = 'lloyd-commons-photo-' + r.w + 'x' + r.h + '.jpg'; $('ph-meta').textContent = r.w + ' × ' + r.h + ' px · ' + r.samples + ' passes · ' + (r.ms / 1000).toFixed(1) + ' s'; } }); }
  on('ph-go', photoGo); on('ph-cancel', () => { if (X.photo.busy()) X.photo.cancel(); else PH.className = ''; }); on('ph-close', () => { PH.className = ''; }); on('ph-close2', () => { PH.className = ''; });
  ring.style.strokeDasharray = RC;
  $('tiltTog').onchange = e => X.setTilt(e.target.checked);
  // ------------------------------------------------------------ quality badge + material streaming indicator
  const QN = { ultra: 'Ultra', high: 'High', mobile: 'Mobile' };
  $('q-cur').textContent = QN[X.TIER];
  $('q-menu').innerHTML = Object.keys(QN).map(k => '<button data-testid="quality-option-' + k + '" data-q="' + k + '" class="' + (k === X.TIER ? 'on' : '') + '">' + QN[k] + '<small>' + { ultra: 'Full shadows, occlusion, glow', high: 'Office PCs and laptops', mobile: 'Phones and tablets' }[k] + '</small></button>').join('');
  on('q-btn', () => $('q-wrap').classList.toggle('open'));
  $('q-menu').querySelectorAll('button').forEach(b => b.onclick = () => { const u = new URL(location.href); u.searchParams.set('q', b.dataset.q); location.href = u.toString(); });
  window.addEventListener('lc-loading', e => { const d = e.detail, el = $('loadchip'); if (!el) return; el.classList.toggle('on', d.done < d.total); $('load-n').textContent = 'Materials ' + Math.min(d.done, d.total) + ' / ' + d.total; $('load-bar').style.width = (d.total ? d.done / d.total * 100 : 0) + '%'; });
  on('tour-prev', () => goChapter(ch - 1)); on('tour-next', () => goChapter(ch + 1)); on('tour-close', () => enter('explore'));
  on('cmp-close', () => enter('explore'));
  on('cmp-mode', () => { const b = $('cmp-mode'); b.dataset.m = b.dataset.m === 'swipe' ? 'fade' : 'swipe'; b.textContent = b.dataset.m === 'swipe' ? 'Fade mode' : 'Swipe mode'; applyMix(); });
  $('cmp-mix').oninput = applyMix;
  $('cmp-tabs').innerHTML = REFS.map((r, j) => '<button data-testid="compare-tab-' + r.id + '" data-i="' + j + '">' + r.title + '</button>').join('');
  $('cmp-tabs').querySelectorAll('button').forEach(b => b.onclick = () => setCompare(+b.dataset.i));
  if (!REFS.length) { const b = $('tb-compare'); if (b) b.style.display = 'none'; }
  on('walkPlay', () => { const w = X.walkState(); if (!w) return; w.play = !w.play; if (w.t >= 1) w.t = 0; $('walkPlay').textContent = w.play ? 'Pause' : 'Play'; });
  $('walkSlider').oninput = e => { const w = X.walkState(); if (!w) return; w.play = false; $('walkPlay').textContent = 'Play'; w.t = e.target.value / 1000; X.walkAt(w.t); };
  on('walk-exit', () => { enter('explore'); X.flyTo('spine', 1800); });
  const sd = $('sunDay'), sh = $('sunHour');
  sd.value = X.SUN.doy; sh.value = X.SUN.hour * 4;
  const sunIn = () => X.setSun(+sd.value, +sh.value / 4); sd.oninput = sunIn; sh.oninput = sunIn;
  document.querySelectorAll('[data-season]').forEach(b => b.onclick = () => { sd.value = b.dataset.season; sunIn(); });
  on('sun-ref', () => { sd.value = 280; sh.value = 65; sunIn(); });
  const LAY = [['ctx', 'Lloyd District context'], ['trees', 'Trees'], ['people', 'People'], ['vault', 'Glass vaults & hall'], ['roofpark', 'Roof park'], ['streets', 'Streets'], ['labels', 'Labels']];
  $('layers').innerHTML = LAY.map(l => '<label class="tog"><input type="checkbox" data-testid="layer-' + l[0] + '" data-g="' + l[0] + '"' + (B.groups[l[0]].visible ? ' checked' : '') + '><span></span>' + l[1] + '</label>').join('') +
    '<label class="tog"><input type="checkbox" id="splatTog" data-testid="layer-splat"><span></span>Photoreal capture (Gaussian splat)</label><div class="hint" id="splatStatus" data-testid="splat-status">' + (X.splat.url ? 'Capture configured' : 'No capture loaded yet. A drone or phone capture of the Lloyd District plugs in here as a .splat file (add ?splat=URL).') + '</div>';
  $('layers').querySelectorAll('input[data-g]').forEach(i => i.onchange = () => { B.groups[i.dataset.g].visible = i.checked; X.dirty(); });
  $('splatTog').checked = !!X.splat.url;
  $('splatTog').onchange = e => { if (X.splat.mesh) { X.splat.mesh.visible = e.target.checked; X.dirty(); } else if (e.target.checked && !X.splat.url) { e.target.checked = false; toast('No Gaussian-splat capture has been published yet'); } };
  document.addEventListener('keydown', e => { if (mode === 'tour') { if (e.key === 'ArrowRight') goChapter(ch + 1); if (e.key === 'ArrowLeft') goChapter(ch - 1); } if (e.key === 'Escape' && mode !== 'explore' && mode !== 'hero') enter('explore'); });
  body.classList.add('hero-on'); show('hero', !window.CLEAN);
  return { showInfo, hideInfo, enter };
};
