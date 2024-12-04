export const IcyPsychedelicShader = {
  vertexShader: `
    varying vec2 vUv;
    varying float vElevation;
    uniform float uTime;

    void main() {
      vUv = uv;
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);
      
      // Create a more crystalline wave pattern
      float elevation = sin(modelPosition.x * 3.0 + uTime * 0.5) * 
                       cos(modelPosition.z * 3.0 + uTime * 0.5) * 0.1;
                       
      modelPosition.y += elevation;
      vElevation = elevation;

      gl_Position = projectionMatrix * viewMatrix * modelPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;

    void main() {
      // Create shimmering ice effect
      float shimmer = sin(vUv.x * 20.0 + uTime) * cos(vUv.y * 20.0 + uTime) * 0.5 + 0.5;
      
      // Base ice color (light blue)
      vec3 iceColor = vec3(0.8, 0.9, 1.0);
      
      // Add some darker blue variations
      float pattern = sin(vUv.x * 10.0 + uTime * 0.3) * cos(vUv.y * 10.0 + uTime * 0.2);
      vec3 darkBlue = vec3(0.2, 0.4, 0.8);
      
      // Mix colors based on pattern and elevation
      vec3 color = mix(darkBlue, iceColor, shimmer);
      color = mix(color, vec3(1.0), vElevation * 2.0 + 0.5);
      
      // Add transparency for ice effect
      float alpha = 0.8 + shimmer * 0.2;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
} 