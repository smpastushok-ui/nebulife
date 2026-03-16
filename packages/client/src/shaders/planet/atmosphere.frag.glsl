// Atmosphere glow shader - Multi-layer Fresnel glow
// Transparent at center, bright at limb edges with soft outer haze

uniform vec3 uColor;
uniform float uIntensity;
uniform float uPower;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float NdotV = max(dot(vNormal, vViewDir), 0.0);

  // Primary Fresnel (sharp limb glow)
  float fresnel1 = pow(max(1.0 - NdotV, 0.0), uPower);

  // Secondary broader glow (softer falloff for visible haze)
  float fresnel2 = pow(max(1.0 - NdotV, 0.0), max(uPower * 0.5, 1.0));

  // Combine: sharp limb + broad haze
  float alpha = fresnel1 * uIntensity + fresnel2 * uIntensity * 0.3;

  gl_FragColor = vec4(uColor, alpha);
}
