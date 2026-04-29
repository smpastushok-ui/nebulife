// Planetary ring shader - layered Saturn-like bands with deterministic gaps

varying vec2 vUv;
uniform float uSeed;
uniform float uQuality;
uniform float uIsIceGiant;

float hash1(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float bandPulse(float r, float center, float width) {
  return smoothstep(center - width, center, r) * smoothstep(center + width, center, r);
}

void main() {
  // Radial distance from inner to outer (v coordinate)
  float r = vUv.y;
  float a = vUv.x;

  // Broad A/B/C ring regions plus Cassini-like divisions.
  float inner = smoothstep(0.02, 0.09, r) * smoothstep(0.42, 0.32, r);
  float middle = smoothstep(0.32, 0.39, r) * smoothstep(0.73, 0.62, r);
  float outer = smoothstep(0.66, 0.76, r) * smoothstep(0.99, 0.88, r);

  float cassini = bandPulse(r, 0.64 + (hash1(uSeed + 8.0) - 0.5) * 0.025, 0.020);
  float encke = bandPulse(r, 0.84 + (hash1(uSeed + 9.0) - 0.5) * 0.018, 0.010);
  float innerGap = bandPulse(r, 0.28, 0.014);

  // Fine radial striations: many thin semi-transparent ringlets on desktop.
  float q = smoothstep(0.25, 1.0, uQuality);
  float ringletA = sin((r + hash1(uSeed + 2.0) * 0.03) * 180.0);
  float ringletB = sin((r + hash1(uSeed + 3.0) * 0.05) * 430.0);
  float ringletC = sin((r + hash1(uSeed + 4.0) * 0.02) * 890.0);
  float ringlets = 0.72 + 0.13 * ringletA + 0.08 * ringletB * q + 0.04 * ringletC * q;

  // Azimuthal grain stops rings from looking like clean UI ellipses.
  float grain = hash1(floor(a * (90.0 + q * 170.0)) + floor(r * 260.0) * 13.0 + uSeed);
  ringlets *= 0.94 + grain * (0.06 + q * 0.08);

  float alpha = (inner * 0.34 + middle * 0.56 + outer * 0.42) * ringlets;
  alpha *= 1.0 - cassini * 0.88 - encke * (0.45 + q * 0.35) - innerGap * 0.45;
  alpha = clamp(alpha, 0.0, 0.72);

  // Warm color gradient: inner = bright, outer = darker
  vec3 warmInner = vec3(0.92, 0.82, 0.64);
  vec3 warmMid = vec3(0.72, 0.63, 0.50);
  vec3 warmOuter = vec3(0.46, 0.43, 0.38);
  vec3 iceTint = mix(vec3(0.70, 0.76, 0.82), vec3(0.52, 0.62, 0.72), r);
  vec3 warm = mix(mix(warmInner, warmMid, smoothstep(0.0, 0.55, r)), warmOuter, smoothstep(0.55, 1.0, r));
  vec3 color = mix(warm, iceTint, uIsIceGiant * 0.62);
  color *= 0.92 + ringletA * 0.035 + ringletB * 0.025 * q;

  // Approximate planet shadow sweeping across the rings, soft not black.
  float shadow = smoothstep(0.42, 0.52, a) * smoothstep(0.78, 0.58, a);
  alpha *= 1.0 - shadow * (0.20 + q * 0.20);
  color *= 1.0 - shadow * (0.10 + q * 0.12);

  gl_FragColor = vec4(color, alpha);
}
