(() => {
  const hero = document.querySelector('.hero-main');
  const canvas = hero?.querySelector('.hero-depth');
  const image = hero?.querySelector('.hero-bg');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!hero || !canvas || !image || reduced.matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let gl, program, ready = false, frame = 0, lastTime = 0;
  let current = [0, 0], target = [0, 0];
  const vertex = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() { v_uv = (a_position + 1.0) * 0.5; gl_Position = vec4(a_position, 0.0, 1.0); }
  `;
  const fragment = `
    precision mediump float;
    varying vec2 v_uv;
    uniform sampler2D u_image;
    uniform sampler2D u_depth;
    uniform vec2 u_crop;
    uniform vec2 u_center;
    uniform vec2 u_motion;
    void main() {
      vec2 uv = (v_uv - 0.5) * u_crop + u_center;
      float depth = texture2D(u_depth, uv).r;
      vec2 displaced = uv - u_motion * (depth - 0.08);
      depth = texture2D(u_depth, displaced).r;
      displaced = uv - u_motion * (depth - 0.08);
      gl_FragColor = texture2D(u_image, displaced);
    }
  `;

  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Depth shader unavailable.');
    return result;
  }
  function texture(source, unit) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    const result = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, result);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    return result;
  }
  function fallback() {
    ready = false; cancelAnimationFrame(frame); frame = 0;
    hero.classList.remove('hero-depth-ready');
  }
  function draw() {
    gl.uniform2f(gl.getUniformLocation(program, 'u_motion'), current[0] * .007, current[1] * .009);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function resize() {
    if (!ready) return;
    const rect = hero.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.5, 2400 / rect.width);
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const imageAspect = image.naturalWidth / image.naturalHeight;
    const areaAspect = rect.width / rect.height;
    const x = Math.min(1, areaAspect / imageAspect), y = Math.min(1, imageAspect / areaAspect);
    // Match the original cover crop and 75% horizontal position; overscan hides edges.
    gl.uniform2f(gl.getUniformLocation(program, 'u_crop'), x * .974, y * .974);
    gl.uniform2f(gl.getUniformLocation(program, 'u_center'), x / 2 + (1 - x) * .75, .5);
    draw();
  }
  function tick(time) {
    frame = 0;
    if (!ready || reduced.matches || document.hidden) return;
    const blend = 1 - Math.exp(-Math.min(time - (lastTime || time - 16), 40) / 110);
    lastTime = time;
    current = current.map((value, i) => value + (target[i] - value) * blend);
    const moving = current.some((value, i) => Math.abs(target[i] - value) > .0005);
    if (!moving) current = [...target];
    draw();
    if (moving) frame = requestAnimationFrame(tick);
  }
  function animate() {
    if (!frame && ready && !reduced.matches) { lastTime = 0; frame = requestAnimationFrame(tick); }
  }
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !ready || reduced.matches) return;
    const rect = hero.getBoundingClientRect();
    target = [Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1)), Math.max(-1, Math.min(1, 1 - (event.clientY - rect.top) / rect.height * 2))];
    animate();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { target = [0, 0]; animate(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; target = [0, 0]; }
    else animate();
  });
  reduced.addEventListener('change', () => {
    cancelAnimationFrame(frame); frame = 0; current = target = [0, 0];
    hero.classList.toggle('hero-depth-ready', ready && !reduced.matches);
    if (ready) draw();
  });
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fallback(); });

  (async () => {
    try {
      await image.decode();
      const depth = new Image(); depth.src = new URL('assets/hero-depth.svg', document.baseURI).href;
      await depth.decode();
      gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
      if (!gl) return;
      program = gl.createProgram();
      gl.attachShader(program, shader(gl.VERTEX_SHADER, vertex)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragment)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Depth renderer unavailable.');
      gl.useProgram(program);
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'a_position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture(image, 0); texture(depth, 1);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Depth textures unavailable.');
      gl.uniform1i(gl.getUniformLocation(program, 'u_image'), 0); gl.uniform1i(gl.getUniformLocation(program, 'u_depth'), 1);
      ready = true; resize();
      new ResizeObserver(resize).observe(hero);
      hero.classList.toggle('hero-depth-ready', !reduced.matches);
    } catch { fallback(); }
  })();
})();
