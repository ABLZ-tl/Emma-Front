import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import { Leva } from "leva";
import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { UI } from "./components/UI";

// Componente para configurar el renderer para AR
const ARRendererSetup = ({ arMode }) => {
  const { gl } = useThree();
  
  useEffect(() => {
    if (arMode) {
      // Configurar renderer para mostrar la cámara en AR
      gl.setClearColor(0x000000, 0); // Fondo transparente
      gl.domElement.style.position = 'absolute';
      gl.domElement.style.top = '0';
      gl.domElement.style.left = '0';
    } else {
      // Restaurar configuración normal
      gl.setClearColor(0x000000, 1);
    }
  }, [arMode, gl]);

  return null;
};

function App() {
  const [arMode, setArMode] = useState(false);

  useEffect(() => {
    // Cambiar el fondo del body cuando está en modo AR
    const body = document.body;
    if (arMode) {
      body.style.backgroundColor = 'transparent';
      body.style.backgroundImage = 'none';
      body.classList.add('ar-mode');
    } else {
      body.style.backgroundColor = '';
      body.style.backgroundImage = '';
      body.classList.remove('ar-mode');
    }
  }, [arMode]);

  return (
    <>
      <Loader />
      <Leva hidden />
      <UI arMode={arMode} setArMode={setArMode} />
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 1], fov: 30 }}
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: "high-performance",
          pixelRatio: Math.min(window.devicePixelRatio, 2), // Mejor calidad sin sobrecargar
          precision: "highp", // Alta precisión
          stencil: false,
          depth: true,
          logarithmicDepthBuffer: false
        }}
        dpr={[1, 2]} // Device pixel ratio entre 1 y 2
        style={{ background: arMode ? 'transparent' : undefined }}
      >
        <ARRendererSetup arMode={arMode} />
        {arMode ? (
          <XR
            sessionInit={{
              requiredFeatures: ['local-floor'],
              optionalFeatures: ['bounded-floor']
            }}
            onError={(error) => {
              console.error('Error en sesión XR:', error);
              setArMode(false);
              alert('Error al iniciar AR. Asegúrate de usar HTTPS y un dispositivo compatible.');
            }}
          >
            <Experience arMode={arMode} />
          </XR>
        ) : (
          <Experience arMode={arMode} />
        )}
      </Canvas>
    </>
  );
}

export default App;
