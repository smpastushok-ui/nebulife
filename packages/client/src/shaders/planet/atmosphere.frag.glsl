// Atmosphere glow shader — Production-quality multi-layer exosphere
// Features:
//   1. Multi-layer Fresnel glow (sharp limb + broad haze)
//   2. Rayleigh scattering: blue shift at limb, warm shift at terminator
//   3. Star-lit terminator glow (sunset/sunrise rim)
//   4. Back-lit atmospheric haze (light wrapping around planet)
//   5. Depth-based density (thicker atmosphere = more opaque near horizon)

uniform vec3  uColor;
uniform float uIntensity;
uniform float uPower;
uniform vec3  uStarDir;       // normalized direction TO the star
uniform float uPressure;      // surface pressure in atm (drives density)

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uStarDir);

  float NdotV = max(dot(N, V), 0.0);
  float NdotL = dot(N, L);

  // ---- 1. Multi-layer Fresnel (core glow) ----
  float limb = max(1.0 - NdotV, 0.0);

  // Primary: sharp edge glow
  float fresnel1 = pow(limb, uPower);

  // Secondary: broader haze extending inward
  float fresnel2 = pow(limb, max(uPower * 0.45, 1.0));

  float baseAlpha = fresnel1 * uIntensity + fresnel2 * uIntensity * 0.35;

  // ---- 2. Rayleigh scattering ----
  // At the limb: light travels through more atmosphere -> scatters blue
  // Near terminator: long path -> red/orange (sunset effect)
  vec3 scatterColor = uColor;

  // View-angle dependent color shift (more blue at limb for N2/O2 atmospheres)
  float scatterShift = pow(limb, 1.5);
  vec3 blueShift = vec3(0.5, 0.7, 1.0);  // Rayleigh blue
  scatterColor = mix(uColor, uColor * blueShift, scatterShift * 0.3);

  // Terminator warm shift: long optical path at sunrise/sunset
  float terminatorBand = smoothstep(-0.15, 0.05, NdotL) * smoothstep(0.20, 0.0, NdotL);
  vec3 warmShift = vec3(1.4, 0.7, 0.35);
  scatterColor = mix(scatterColor, uColor * warmShift, terminatorBand * 0.5);

  // ---- 3. Star-lit terminator glow ----
  // Atmosphere lights up at the day/night boundary (light skimming the surface)
  float terminatorGlow = smoothstep(-0.25, 0.0, NdotL) * smoothstep(0.15, -0.05, NdotL);
  // Stronger at the limb (where atmosphere is visible)
  terminatorGlow *= pow(limb, max(uPower * 0.6, 1.2));
  baseAlpha += terminatorGlow * uIntensity * 0.6;

  // ---- 4. Back-lit haze (light wrapping) ----
  // Light wraps around the planet through the atmosphere
  // Visible even slightly on the night side at the very edge
  float backLitFactor = smoothstep(-0.35, -0.05, NdotL) * pow(limb, max(uPower * 0.5, 1.0));
  baseAlpha += backLitFactor * uIntensity * 0.25;

  // Backlit color: slightly warmer due to long path absorption
  vec3 backLitColor = uColor * vec3(1.2, 0.85, 0.6);
  scatterColor = mix(scatterColor, backLitColor, backLitFactor * 0.4);

  // ---- 5. Day-side brightness boost ----
  // Atmosphere on the lit side is naturally brighter
  float dayBoost = smoothstep(-0.1, 0.5, NdotL);
  baseAlpha *= 0.6 + dayBoost * 0.4;

  // ---- 6. Pressure-dependent density ----
  // Thick atmospheres (Venus ~90 atm) show more haze; thin (Mars ~0.006) show less
  float densityMul = 0.7 + clamp(uPressure, 0.0, 5.0) * 0.12;
  baseAlpha *= densityMul;

  // Clamp final alpha
  baseAlpha = clamp(baseAlpha, 0.0, 0.85);

  gl_FragColor = vec4(scatterColor, baseAlpha);
}
