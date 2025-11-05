import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Partículas que cubren el modelo
const HologramParticles = () => {
  const particlesRef = useRef();
  const count = 200; // Más partículas para cubrir mejor

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color(0x00d4ff);

    // Distribuir partículas alrededor del modelo (forma más cercana)
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 0.5 + Math.random() * 1.5; // Más cerca del modelo
      const theta = (i / count) * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = -0.5 + Math.random() * 2.5; // Distribuir en altura
      positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        // Movimiento sutil alrededor del modelo
        const time = state.clock.elapsedTime;
        const radius = 0.5 + Math.sin(time * 0.5 + i) * 0.3 + Math.random() * 0.5;
        const theta = (i / count) * Math.PI * 2 + time * 0.1;
        const phi = Math.sin(time * 0.3 + i) * Math.PI * 0.5 + Math.PI * 0.5;
        
        positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles.positions}
          itemSize={2}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={2}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Componente wrapper que agrega efectos visuales y aplica opacidad/glitch
export const HologramWrapper = ({ children }) => {
  const wrapperRef = useRef();
  const groupRef = useRef();
  const originalMaterialsRef = useRef(new Map());
  const originalPositionsRef = useRef(new Map());
  const originalScalesRef = useRef(new Map());
  const glitchTimerRef = useRef(0);
  const glitchActiveRef = useRef(false);

  useEffect(() => {
    if (!groupRef.current) return;

    const group = groupRef.current;
    
    // Aplicar opacidad y guardar estados originales
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        // Guardar material original
        if (!originalMaterialsRef.current.has(child.uuid)) {
          originalMaterialsRef.current.set(child.uuid, child.material);
        }

        // Guardar posición y escala originales
        if (!originalPositionsRef.current.has(child.uuid)) {
          originalPositionsRef.current.set(child.uuid, child.position.clone());
        }
        if (!originalScalesRef.current.has(child.uuid)) {
          originalScalesRef.current.set(child.uuid, child.scale.clone());
        }

        const originalMat = originalMaterialsRef.current.get(child.uuid);
        const materials = Array.isArray(originalMat) ? originalMat : [originalMat];
        
        // Aplicar opacidad sin modificar texturas
        const processedMaterials = materials.map((mat) => {
          if (!mat) return mat;
          
          const newMat = mat.clone();
          newMat.transparent = true;
          newMat.opacity = 0.7;
          
          // Aplicar tinte azul sutil sin arruinar las texturas
          if (newMat.color) {
            // Solo un ligero tinte, no modificar mucho el color
            newMat.color.multiply(new THREE.Color(0.95, 0.98, 1.0));
          }
          
          return newMat;
        });

        child.material = Array.isArray(originalMat) ? processedMaterials : processedMaterials[0];
      }
    });

    return () => {
      // Restaurar materiales originales
      group.traverse((child) => {
        if (child.isMesh && originalMaterialsRef.current.has(child.uuid)) {
          child.material = originalMaterialsRef.current.get(child.uuid);
        }
        if (child.isMesh && originalPositionsRef.current.has(child.uuid)) {
          child.position.copy(originalPositionsRef.current.get(child.uuid));
        }
        if (child.isMesh && originalScalesRef.current.has(child.uuid)) {
          child.scale.copy(originalScalesRef.current.get(child.uuid));
        }
      });
    };
  }, []);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    glitchTimerRef.current += state.clock.deltaTime;
    
    // Resetear glitch después de un tiempo
    if (glitchTimerRef.current > 0.1) {
      glitchActiveRef.current = false;
      glitchTimerRef.current = 0;
    }
    
    // Aplicar efecto glitch aleatorio
    if (Math.random() > 0.96 && !glitchActiveRef.current) {
      glitchActiveRef.current = true;
      glitchTimerRef.current = 0;
    }
    
    // Aplicar efecto glitch mediante modificación de posición y escala
    if (groupRef.current) {
      groupRef.current.traverse((child) => {
        if (child.isMesh) {
          const originalPos = originalPositionsRef.current.get(child.uuid);
          const originalScale = originalScalesRef.current.get(child.uuid);
          
          if (!originalPos || !originalScale) return;
          
          if (glitchActiveRef.current && glitchTimerRef.current < 0.1) {
            // Glitch activo - desplazamiento aleatorio
            const glitchIntensity = 1 - (glitchTimerRef.current / 0.1);
            const offset = new THREE.Vector3(
              (Math.random() - 0.5) * 0.04 * glitchIntensity,
              (Math.random() - 0.5) * 0.03 * glitchIntensity,
              (Math.random() - 0.5) * 0.04 * glitchIntensity
            );
            child.position.copy(originalPos).add(offset);
            
            // Variación en escala
            const scaleVariation = 1 + (Math.random() - 0.5) * 0.02 * glitchIntensity;
            child.scale.copy(originalScale).multiplyScalar(scaleVariation);
          } else {
            // Estado normal con micro-variaciones sutiles
            child.position.copy(originalPos);
            
            // Efecto de glitch continuo muy sutil en la escala
            const microGlitch = 1 + Math.sin(time * 15 + child.position.y * 8) * 0.003;
            child.scale.copy(originalScale).multiplyScalar(microGlitch);
          }
          
          // Efecto de glitch en materiales (opacidad)
          if (child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((mat) => {
              if (!mat) return;
              
              if (glitchActiveRef.current && glitchTimerRef.current < 0.1) {
                // Parpadeo durante glitch
                const glitchIntensity = 1 - (glitchTimerRef.current / 0.1);
                mat.opacity = 0.7 * (0.6 + Math.random() * 0.4 * glitchIntensity);
              } else {
                mat.opacity = 0.7;
              }
            });
          }
        }
      });
    }
  });

  return (
    <group ref={wrapperRef}>
      {/* Modelo con opacidad y efecto glitch */}
      <group ref={groupRef}>
        {children}
      </group>
      
      {/* Partículas que cubren el modelo */}
      <HologramParticles />
      
      {/* Efecto de scanline horizontal */}
      <Scanlines />
    </group>
  );
};

// Efecto de scanlines que cubren el modelo
const Scanlines = () => {
  const scanlinesRef = useRef();

  useFrame((state) => {
    if (scanlinesRef.current) {
      // Mover scanlines verticalmente
      scanlinesRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 1.5;
      scanlinesRef.current.material.opacity = Math.sin(state.clock.elapsedTime * 8) * 0.15 + 0.15;
    }
  });

  return (
    <mesh ref={scanlinesRef} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[5, 5, 1, 100]} />
      <meshBasicMaterial
        color={0x00d4ff}
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
        wireframe
      />
    </mesh>
  );
};

