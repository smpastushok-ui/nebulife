// Atmosphere glow shader — Production-quality multi-layer exosphere
// Features:
//   1. Multi-layer Fresnel glow (sharp limb + broad haze + outer exosphere)
//   2. Rayleigh scattering: blue shift at limb, warm shift at terminator
//   3. Mie forward scattering: bright halo near star direction
//   4. Star-lit terminator glow (sunset/sunrise rim)
//   5. Back-lit atmospheric haze (light wrapping around planet)
//   6. Outer exosphere halo (extremely faint extended corona)
//   7. Airglow emission (faint night-side chemiluminescence)
//   8. Pressure-dependent density

uniform vec3  uColor;
uniform float uIntensity;
uniform float uPower;
uniform vec3  uStarDir;       // normalized direction TO the star
uniform float uPressure;      // surface pressure in atm

varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vPosition;

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(vViewDir);
  vec3 L = normalize(uStarDir);

  float NdotV = max(dot(N, V), 0.0);
  float NdotL = dot(N, L);
  float VdotL = max(dot(V, L), 0.0);

  // ---- 1. Multi-layer Fresnel (core glow) ----
  float limb = max(1.0 - NdotV, 0.0);

  // Primary: sharp edge glow
  float fresnel1 = pow(limb, uPower);
  // Secondary: broader haze extending inward
  float fresnel2 = pow(limb, max(uPower * 0.45, 1.0));
  // Tertiary: very broad faint halo (exosphere)
  float fresnel3 = pow(limb, max(uPower * 0.25, 0.6));

  float baseAlpha = fresnel1 * uIntensity
                  + fresnel2 * uIntensity * 0.35
                  + fresnel3 * uIntensity * 0.08; // faint outer halo

  // ---- 2. Rayleigh scattering ----
  vec3 scatterColor = uColor;

  // View-angle dependent blue shift (Rayleigh: ~1/lambda^4)
  float scatterShift = pow(limb, 1.5);
  vec3 blueShift = vec3(0.5, 0.7, 1.0);
  scatterColor = mix(uColor, uColor * blueShift, scatterShift * 0.3);

  // Terminator warm shift (long optical path at sunset)
  float terminatorBand = smoothstep(-0.15, 0.05, NdotL) * smoothstep(0.20, 0.0, NdotL);
  vec3 warmShift = vec3(1.4, 0.7, 0.35);
  scatterColor = mix(scatterColor, uColor * warmShift, terminatorBand * 0.5);

  // ---- 3. Mie forward scattering ----
  // Bright halo when looking toward the star through the atmosphere
  // Henyey-Greenstein phase function approximation (g=0.76)
  float g = 0.76;
  float cosTheta = VdotL;
  float miePhase = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cosTheta, 1.5);
  miePhase = miePhase / (4.0 * 3.14159);

  // Mie only visible at the limb (where atmosphere is dense)
  float mieMask = pow(limb, max(uPower * 0.5, 1.0));
  float mieGlow = mieMask * miePhase * 0.3;

  // Mie color: warmer than Rayleigh (larger particles scatter all wavelengths)
  vec3 mieColor = uColor * vec3(1.15, 1.05, 0.95);
  scatterColor = mix(scatterColor, mieColor, clamp(mieGlow * 2.0, 0.0, 0.4));
  baseAlpha += mieGlow * uIntensity;

  // ---- 4. Star-lit terminator glow ----
  float terminatorGlow = smoothstep(-0.25, 0.0, NdotL) * smoothstep(0.15, -0.05, NdotL);
  terminatorGlow *= pow(limb, max(uPower * 0.6, 1.2));
  baseAlpha += terminatorGlow * uIntensity * 0.6;

  // ---- 5. Back-lit haze (light wrapping) ----
  float backLitFactor = smoothstep(-0.35, -0.05, NdotL) * pow(limb, max(uPower * 0.5, 1.0));
  baseAlpha += backLitFactor * uIntensity * 0.25;

  vec3 backLitColor = uColor * vec3(1.2, 0.85, 0.6);
  scatterColor = mix(scatterColor, backLitColor, backLitFactor * 0.4);

  // ---- 6. Day-side brightness boost ----
  float dayBoost = smoothstep(-0.1, 0.5, NdotL);
  baseAlpha *= 0.55 + dayBoost * 0.45;

  // ---- 7. Airglow (faint night-side emission) ----
  // Real phenomenon: O2/OH chemiluminescence creates faint green/red glow
  float nightSide = smoothstep(0.0, -0.3, NdotL);
  float airglow = nightSide * pow(limb, max(uPower * 0.7, 1.5)) * 0.06;
  vec3 airglowColor = vec3(0.3, 0.8, 0.4); // green oxygen emission
  scatterColor = mix(scatterColor, airglowColor, airglow * 0.3);
  baseAlpha += airglow * uIntensity;

  // ---- 8. Pressure-dependent density ----
  float densityMul = 0.7 + clamp(uPressure, 0.0, 5.0) * 0.12;
  baseAlpha *= densityMul;

  baseAlpha = clamp(baseAlpha, 0.0, 0.85);

  gl_FragColor = vec4(scatterColor, baseAlpha);
}
