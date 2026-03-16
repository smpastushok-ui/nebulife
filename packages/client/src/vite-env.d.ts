/// <reference types="vite/client" />

// GLSL shader file imports (Vite ?raw)
declare module '*.glsl?raw' {
  const value: string;
  export default value;
}
