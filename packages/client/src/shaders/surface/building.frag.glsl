// Building fragment shader — emissive pulse, level glow, alpha cutoff
// Applied to textured building planes on the surface

precision highp float;

uniform sampler2D uBuildingTex;
uniform float uTime;
uniform float uLevel;        // 1-5
uniform vec3  uAccentColor;  // per-type accent color
uniform float uSelected;     // 1.0 if building is selected/highlighted

varying vec2 vUv;

void main() {
  vec4 tex = texture2D(uBuildingTex, vUv);

  // Alpha cutoff — discard fully transparent pixels
  if (tex.a < 0.05) discard;

  vec3 color = tex.rgb;

  // Subtle emissive pulse (buildings "breathe" with energy)
  float pulse = 0.92 + 0.08 * sin(uTime * 1.8 + uLevel * 0.7);
  color *= pulse;

  // Level-based glow — higher levels glow slightly brighter
  float levelGlow = (uLevel - 1.0) / 4.0 * 0.12;
  color += uAccentColor * levelGlow;

  // Selection highlight (pulsing bright outline effect)
  if (uSelected > 0.5) {
    float selPulse = 0.5 + 0.5 * sin(uTime * 4.0);
    float edge = smoothstep(0.0, 0.15, tex.a) * (1.0 - smoothstep(0.85, 1.0, tex.a));
    color += uAccentColor * edge * selPulse * 0.4;
  }

  gl_FragColor = vec4(color, tex.a);
}
