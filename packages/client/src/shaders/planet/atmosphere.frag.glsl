// Atmosphere glow shader - Fresnel-based edge glow
// Transparent at center, bright at limb edges

uniform vec3 uColor;
uniform float uIntensity;
uniform float uPower;

varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  float fresnel = 1.0 - dot(vNormal, vViewDir);
  fresnel = pow(max(fresnel, 0.0), uPower);
  gl_FragColor = vec4(uColor, fresnel * uIntensity);
}
