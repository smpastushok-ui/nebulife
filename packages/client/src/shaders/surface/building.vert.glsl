// Building vertex shader — textured planes with per-instance data
// Passes UV and instance data to fragment shader

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
