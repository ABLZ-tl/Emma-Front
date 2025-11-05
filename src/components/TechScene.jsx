import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";

// Grid tecnológico en el suelo con efecto más visible
const TechGrid = () => {
  const gridRef = useRef();

  return (
    <group ref={gridRef}>
      <gridHelper
        args={[20, 20, 0x00d4ff, 0x0066aa]}
        position={[0, -0.1, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
      {/* Grid adicional con líneas más brillantes */}
      <gridHelper
        args={[20, 20, 0x00ffff, 0x0088cc]}
        position={[0, -0.09, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
};

// Partículas flotantes tecnológicas
const TechParticles = () => {
  const particlesRef = useRef();
  const count = 100;

  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const color = new THREE.Color(0x00d4ff);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 20;
      positions[i3 + 1] = Math.random() * 10;
      positions[i3 + 2] = (Math.random() - 0.5) * 20;

      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.1;
      
      const positions = particlesRef.current.geometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3 + 1] += Math.sin(state.clock.elapsedTime + i) * 0.001;
        if (positions[i3 + 1] > 10) positions[i3 + 1] = 0;
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
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={count}
          array={particles.colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        vertexColors
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Líneas de energía
const EnergyLines = () => {
  const linesRef = useRef([]);

  useFrame((state) => {
    linesRef.current.forEach((line, i) => {
      if (line) {
        const time = state.clock.elapsedTime;
        line.position.y = Math.sin(time * 2 + i) * 0.3 + 0.5;
        line.material.opacity = Math.sin(time * 3 + i) * 0.3 + 0.5;
      }
    });
  });

  return (
    <>
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const radius = 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <mesh
            key={i}
            ref={(el) => (linesRef.current[i] = el)}
            position={[x, 0.5, z]}
            rotation={[0, angle, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.01, 0.01, 2, 8]} />
            <meshStandardMaterial
              color={0x00d4ff}
              emissive={0x00d4ff}
              emissiveIntensity={0.8}
              transparent
              opacity={0.6}
            />
          </mesh>
        );
      })}
    </>
  );
};

// Escenario tecnológico completo
export const TechScene = ({ arMode }) => {
  if (arMode) return null; // No mostrar en AR

  return (
    <group>
      {/* Grid en el suelo */}
      <TechGrid />
      
      {/* Partículas flotantes */}
      <TechParticles />
      
      {/* Líneas de energía */}
      <EnergyLines />
      
      {/* Plano base tecnológico con efecto glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color={0x001122}
          emissive={0x00d4ff}
          emissiveIntensity={0.1}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Luces ambientales azules */}
      <pointLight position={[0, 5, 0]} color={0x00d4ff} intensity={0.5} distance={15} />
      <pointLight position={[5, 3, 5]} color={0x00d4ff} intensity={0.3} distance={12} />
      <pointLight position={[-5, 3, -5]} color={0x00d4ff} intensity={0.3} distance={12} />
      <pointLight position={[0, 2, -5]} color={0x00d4ff} intensity={0.4} distance={10} />
    </group>
  );
};

