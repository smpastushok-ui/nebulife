// Shared vertex shader for planet surface rendering
// Passes world-space position, normal, and view direction to fragment shader

varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vViewDir;

void main() {
  vPosition = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
