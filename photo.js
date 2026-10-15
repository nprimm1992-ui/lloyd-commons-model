// Photo mode: freezes the view and progressively refines one still. Each sample uses sub-pixel camera jitter
// (supersampled anti-aliasing), a sun position jittered across a ~1° disc (true soft penumbrae from accumulated
// shadow maps), fresh SAO and bloom, and city reflections from a cube capture. Samples are averaged in HDR, then graded.
window.LC_PHOTO = function (X) {
  const { renderer, scene, camera, sun, T } = X;
  let job = null;
  const accMat = new THREE.ShaderMaterial({
    uniforms: { tNew: { value: null }, tOld: { value: null }, w: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D tNew; uniform sampler2D tOld; uniform float w; varying vec2 vUv; void main(){ gl_FragColor = mix(texture2D(tOld, vUv), texture2D(tNew, vUv), w); }',
    depthTest: false, depthWrite: false
  });
  const quad = new THREE.FullScreenQuad(accMat);
  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

  function size(maxW) {
    const cw = renderer.domElement.clientWidth, ch = renderer.domElement.clientHeight, k = Math.min(maxW / cw, maxW / ch, 4);
    return [Math.round(cw * k), Math.round(ch * k)];
  }

  function start(opt) {
    if (job) return;
    opt = Object.assign({ samples: T.samples, maxW: T.photoMax, tilt: false }, opt || {});
    const [w, h] = size(opt.maxW), gl2 = renderer.capabilities.isWebGL2, type = gl2 ? THREE.HalfFloatType : THREE.UnsignedByteType;
    X.lock(true);
    const saved = { pr: renderer.getPixelRatio(), env: scene.environment, sunPos: sun.position.clone(), map: sun.shadow.mapSize.x, autoClear: renderer.autoClear };
    renderer.setPixelRatio(1); renderer.setSize(w, h, false);
    // higher-resolution shadow map for the still
    const sm = Math.min(renderer.capabilities.maxTextureSize, T.lite ? 2048 : 4096 * (T.shadow >= 4096 ? 2 : 1));
    if (sm !== saved.map) { sun.shadow.mapSize.set(sm, sm); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    // city reflections: cube capture from mid-site, filtered for glass and water
    let cubeRT = null, envPM = null;
    try {
      cubeRT = new THREE.WebGLCubeRenderTarget(T.lite ? 128 : 256, { type: type, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
      const cc = new THREE.CubeCamera(2, 5000, cubeRT); cc.position.copy(X.W(X.S.cx - 20, X.S.cy, 42)); scene.add(cc); cc.update(renderer, scene); scene.remove(cc);
      envPM = X.pmrem.fromCubemap(cubeRT.texture); scene.environment = envPM.texture;
    } catch (e) { scene.environment = saved.env; }
    // dedicated, non-multisampled pipeline at the still's resolution
    const comp = new THREE.EffectComposer(renderer, new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat, type }));
    comp.renderToScreen = false; comp.setPixelRatio(1); comp.setSize(w, h);
    comp.addPass(new THREE.RenderPass(scene, camera));
    if (THREE.SAOPass && !T.lite) { const s = new THREE.SAOPass(scene, camera, false, false, new THREE.Vector2(w, h)); Object.assign(s.params, X.SAOP()); comp.addPass(s); }
    if (THREE.UnrealBloomPass) comp.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(w, h), 0.2, 0.5, 0.88));
    const mk = () => new THREE.WebGLRenderTarget(w, h, { format: THREE.RGBAFormat, type, depthBuffer: false });
    let A = mk(), Bt = mk();
    const gm = X.PASS.grade.material, fin = { grade: new THREE.ShaderPass({ uniforms: THREE.UniformsUtils.clone(gm.uniforms), vertexShader: gm.vertexShader, fragmentShader: gm.fragmentShader }) };
    if (opt.tilt && THREE.HorizontalTiltShiftShader) { fin.th = new THREE.ShaderPass(THREE.HorizontalTiltShiftShader); fin.tv = new THREE.ShaderPass(THREE.VerticalTiltShiftShader); fin.th.uniforms.h.value = 2.6 / w; fin.tv.uniforms.v.value = 2.6 / h; fin.th.uniforms.r.value = fin.tv.uniforms.r.value = 0.45; }
    // sun disc jitter basis
    const L = saved.sunPos.clone().sub(sun.target.position), Rl = L.length(), Ld = L.clone().normalize();
    const e1 = new THREE.Vector3(0, 1, 0).cross(Ld).normalize(), e2 = Ld.clone().cross(e1).normalize(), disc = 0.95 * Math.PI / 180;
    job = { w, h, i: 0, n: opt.samples, saved, comp, A, Bt, fin, cubeRT, envPM, cancelled: false, onProgress: opt.onProgress, onDone: opt.onDone, t0: performance.now() };
    const step = () => {
      if (!job) return;
      if (job.cancelled) return finish(false);
      const t1 = performance.now();
      do {
        const i = job.i, jx = halton(i + 1, 2) - 0.5, jy = halton(i + 1, 3) - 0.5;
        camera.setViewOffset(w, h, jx, jy, w, h);
        const r = Math.sqrt(halton(i + 1, 5)) * disc, a = halton(i + 1, 7) * Math.PI * 2;
        sun.position.copy(sun.target.position).addScaledVector(Ld.clone().addScaledVector(e1, Math.cos(a) * r).addScaledVector(e2, Math.sin(a) * r).normalize(), Rl);
        comp.render();
        accMat.uniforms.tNew.value = comp.readBuffer.texture; accMat.uniforms.tOld.value = job.A.texture; accMat.uniforms.w.value = 1 / (i + 1);
        renderer.setRenderTarget(job.Bt); quad.render(renderer); const tmp = job.A; job.A = job.Bt; job.Bt = tmp;
        job.i++;
      } while (job.i < job.n && performance.now() - t1 < 40);
      present(job.i >= job.n);
      if (job.onProgress) job.onProgress(job.i / job.n, job.i, job.n);
      if (job.i >= job.n) return finish(true);
      setTimeout(step, 0);
    };
    present(false); setTimeout(step, 30);
  }

  function present(final) {
    const j = job; let src = j.A;
    if (final && j.fin.th) { const t1 = new THREE.WebGLRenderTarget(j.w, j.h, { type: j.A.texture.type }), t2 = t1.clone(); j.fin.th.render(renderer, t1, src); j.fin.tv.render(renderer, t2, t1); src = t2; j.tmp = [t1, t2]; }
    j.fin.grade.renderToScreen = true; j.fin.grade.render(renderer, null, src);
  }

  function finish(ok) {
    const j = job; let url = null;
    if (ok) { try { url = renderer.domElement.toDataURL('image/jpeg', 0.94); } catch (e) { } }
    camera.clearViewOffset(); sun.position.copy(j.saved.sunPos);
    if (sun.shadow.mapSize.x !== j.saved.map) { sun.shadow.mapSize.set(j.saved.map, j.saved.map); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
    scene.environment = j.saved.env; if (j.envPM) j.envPM.dispose(); if (j.cubeRT) j.cubeRT.dispose();
    j.A.dispose(); j.Bt.dispose(); (j.tmp || []).forEach(t => t.dispose()); j.comp.renderTarget1.dispose(); j.comp.renderTarget2.dispose();
    renderer.setRenderTarget(null); renderer.setPixelRatio(j.saved.pr); job = null; X.lock(false);
    if (j.onDone) j.onDone(ok ? { url, w: j.w, h: j.h, ms: performance.now() - j.t0, samples: j.n } : null);
  }

  return { start, cancel: () => { if (job) job.cancelled = true; }, busy: () => !!job };
};
