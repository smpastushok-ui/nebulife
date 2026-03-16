// Surface view vertex shader — orthographic full-screen quad
// Passes UV coords to fragment shader for procedural terrain

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
