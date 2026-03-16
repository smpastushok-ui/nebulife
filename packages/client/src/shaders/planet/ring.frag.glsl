// Planetary ring shader - radial bands with gaps (Saturn-like)

varying vec2 vUv;

void main() {
  // Radial distance from inner to outer (v coordinate)
  float r = vUv.y;

  // Multiple semi-transparent bands with Cassini-like gap
  float band1 = smoothstep(0.0, 0.1, r) * smoothstep(0.45, 0.35, r);
  float band2 = smoothstep(0.5, 0.55, r) * smoothstep(1.0, 0.85, r);
  float gap = smoothstep(0.35, 0.45, r) * smoothstep(0.55, 0.5, r);
  float alpha = (band1 * 0.5 + band2 * 0.35) * (1.0 - gap * 0.8);

  // Warm color gradient: inner = bright, outer = darker
  vec3 innerColor = vec3(0.85, 0.75, 0.6);
  vec3 outerColor = vec3(0.55, 0.5, 0.45);
  vec3 color = mix(innerColor, outerColor, r);

  gl_FragColor = vec4(color, alpha);
}
