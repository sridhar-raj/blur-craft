// Liquid Glass in EVERY browser (Chrome, Safari, Firefox), for glass over a backdrop the page draws itself:
// a <canvas>, an <img> or a <video>. CSS can't refract arbitrary page content outside Chromium (Safari
// paints nothing for backdrop-filter: url(), WebKit 245510), but WebGL can refract a known source.
//
//   import { mountWebGLGlass } from "./liquid-glass-webgl.js";
//   const stop = mountWebGLGlass(cardEl, heroCanvas, { blur: 14, bezel: 22, strength: 36, aberration: 0.6 });
//   stop();   // removes it; the element falls back to its glass.css material
//
// What it does: puts a WebGL canvas behind the element's content (under its rim and sheen), samples the
// source at the element's position, bends it through a squircle bezel (the same profile as
// liquid-glass.ts), frosts it, adds chromatic aberration at the rim, boosts saturation and lays the
// element's --glass-dim tint on top. It follows scrolling and resizing; with { live: true } it re-reads the
// source every frame (video, animated canvas).
//
// Limits: only the source is refracted (not other page elements over it); the source must be same-origin
// or CORS-enabled; it stays off on "lite"/"flat" device tiers, under prefers-reduced-transparency, and in
// forced colours. If WebGL isn't available it returns a no-op and the CSS material stays.

const VERT = `attribute vec2 a; varying vec2 uv; void main(){ uv = vec2(a.x * .5 + .5, .5 - a.y * .5); gl_Position = vec4(a, 0., 1.); }`;

const FRAG = `precision highp float;
varying vec2 uv;
uniform sampler2D src;
uniform vec2 srcSize;      // source size in texels
uniform vec4 rect;         // element in source texels: x, y, w, h
uniform float scale;       // texels per CSS px
uniform float radius, bezel, strength, blurPx, aberr, sat, dpr;
uniform vec4 tint;         // rgb + alpha (the element's --glass-dim)

float sdf(vec2 p, vec2 size, float r){            // signed distance, negative inside
  vec2 q = abs(p - size * .5) - (size * .5 - r);
  return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r;
}
float surface(float t){ return pow(1. - pow(1. - t, 4.), .25); }   // convex squircle bezel

vec3 sampleBlur(vec2 at){                          // 12-tap disc + centre, radius blurPx (in texels)
  vec3 c = texture2D(src, at / srcSize).rgb;
  float n = 1.;
  for (int i = 0; i < 12; i++) {
    float a = float(i) * 0.5235988 + 0.3;
    float rr = (mod(float(i), 2.) == 0. ? 1. : .55) * blurPx;
    c += texture2D(src, (at + vec2(cos(a), sin(a)) * rr) / srcSize).rgb; n += 1.;
  }
  return c / n;
}

void main(){
  vec2 size = rect.zw;
  vec2 p = uv * size;
  float d = sdf(p, size, radius);
  if (d > 0.5 * dpr) discard;
  float inside = -d;
  // outward normal from the SDF gradient
  vec2 e = vec2(1., 0.);
  vec2 grad = vec2(sdf(p + e.xy, size, radius) - sdf(p - e.xy, size, radius), sdf(p + e.yx, size, radius) - sdf(p - e.yx, size, radius));
  vec2 nrm = length(grad) > 0. ? normalize(grad) : vec2(0.);
  float m = 0.;
  if (inside < bezel) {
    float t = clamp(inside / bezel, 0., 1.);
    float slope = (surface(min(1., t + .01)) - surface(max(0., t - .01))) / .02;
    m = min(1., slope / 4.);
  }
  vec2 base = rect.xy + p;
  vec2 off = -nrm * m * strength;                  // light bends inward at the rim
  vec3 col;
  col.r = sampleBlur(base + off).r;
  col.g = sampleBlur(base + off * (1. + .08 * aberr)).g;
  col.b = sampleBlur(base + off * (1. + .16 * aberr)).b;
  float l = dot(col, vec3(.2126, .7152, .0722));
  col = mix(vec3(l), col, sat);                    // keep colour alive through the frost
  col = mix(col, tint.rgb, tint.a);                // the element's dim
  col += vec3(1.) * .10 * clamp(1. - (uv.x + uv.y) * .9, 0., 1.);   // the fill's light at the top-left
  float g = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - .5) * .025;                          // 2.5% grain, as the material
  float edge = clamp(.5 - d / dpr, 0., 1.);        // anti-aliased rounded edge
  gl_FragColor = vec4(col * edge, edge);
}`;

function parseRgba(s) {
  const m = s.match(/[\d.]+/g);
  if (!m) return [0.04, 0.04, 0.07, 0.48];
  const [r, g, b, a = "1"] = m;
  return [r / 255, g / 255, b / 255, Math.min(1, Number(a))];
}

export function mountWebGLGlass(el, source, opts = {}) {
  const { bezel = 22, strength = 36, blur = 14, aberration = 0.6, saturate = 1.7, live = false } = opts;
  const root = document.documentElement;
  const off = () => (root.dataset.glassTier && root.dataset.glassTier !== "full")
    || matchMedia("(prefers-reduced-transparency: reduce)").matches || matchMedia("(forced-colors: active)").matches;
  if (off()) return () => {};

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;border-radius:inherit;z-index:-2;pointer-events:none";
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true });
  if (!gl) return () => {};

  const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); }
  catch (e) { console.warn("[blur-craft] WebGL glass shader failed, keeping the CSS material:", e.message); return () => {}; }
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, "a"); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const U = Object.fromEntries(["srcSize", "rect", "scale", "radius", "bezel", "strength", "blurPx", "aberr", "sat", "dpr", "tint"].map((n) => [n, gl.getUniformLocation(prog, n)]));

  const upload = () => {
    try { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source); return true; }
    catch { return false; }   // tainted (cross-origin) or not ready
  };
  if (!upload()) return () => {};

  // The CSS blur must not run underneath as well; remember what to restore.
  const prev = { bf: el.style.getPropertyValue("backdrop-filter"), wbf: el.style.getPropertyValue("-webkit-backdrop-filter") };
  el.style.setProperty("backdrop-filter", "none", "important");
  el.style.setProperty("-webkit-backdrop-filter", "none", "important");
  el.prepend(canvas);

  let raf = 0, alive = true, visible = true;
  const draw = () => {
    raf = 0;
    if (!alive || !visible) return;
    if (off()) { stop(); return; }
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(el.offsetWidth * dpr), h = Math.round(el.offsetHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    if (live) upload();
    const sr = source.getBoundingClientRect(), er = el.getBoundingClientRect();
    const sw = source.videoWidth || source.naturalWidth || source.width, shh = source.videoHeight || source.naturalHeight || source.height;
    const k = sw / sr.width;                                   // source texels per CSS px
    const cs = getComputedStyle(el);
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.srcSize, sw, shh);
    gl.uniform4f(U.rect, (er.left - sr.left) * k, (er.top - sr.top) * k, er.width * k, er.height * k);
    gl.uniform1f(U.scale, k);
    gl.uniform1f(U.radius, Math.min(parseFloat(cs.borderTopLeftRadius) || 24, er.width / 2, er.height / 2) * k);
    gl.uniform1f(U.bezel, bezel * k);
    gl.uniform1f(U.strength, strength * k);
    gl.uniform1f(U.blurPx, blur * k);
    gl.uniform1f(U.aberr, aberration);
    gl.uniform1f(U.sat, saturate);
    gl.uniform1f(U.dpr, k);
    gl.uniform4f(U.tint, ...parseRgba(cs.getPropertyValue("--glass-dim")));
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (live) raf = requestAnimationFrame(draw);
  };
  const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) schedule(); });
  io.observe(el);
  const ro = new ResizeObserver(() => { if (!live) upload(); schedule(); });
  ro.observe(el); ro.observe(source);
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  schedule();

  function stop() {
    if (!alive) return;
    alive = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect();
    removeEventListener("scroll", schedule); removeEventListener("resize", schedule);
    canvas.remove();
    el.style.removeProperty("backdrop-filter"); el.style.removeProperty("-webkit-backdrop-filter");
    if (prev.bf) el.style.setProperty("backdrop-filter", prev.bf);
    if (prev.wbf) el.style.setProperty("-webkit-backdrop-filter", prev.wbf);
  }
  return Object.assign(stop, { refresh: () => { upload(); schedule(); } });
}
