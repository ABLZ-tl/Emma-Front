import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";
import { useXR, useHitTest } from "@react-three/xr";
import { Suspense, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";
import { HologramWrapper } from "./HologramEffect";
import { TechScene } from "./TechScene";

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] = useState("");
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length > 2) {
            return ".";
          }
          return loadingText + ".";
        });
      }, 800);
      return () => clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);
  if (!loading) return null;
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="black" />
      </Text>
    </group>
  );
};

// Componente para manejar hit testing en AR
const ARHitTest = ({ onPositionUpdate, avatarPlaced }) => {
  useHitTest((hitMatrix) => {
    if (!avatarPlaced && hitMatrix) {
      const pos = new THREE.Vector3();
      pos.setFromMatrixPosition(hitMatrix);
      // Actualizar posición en tiempo real mientras no está colocado
      onPositionUpdate([pos.x, pos.y, pos.z]);
    }
  });

  return null;
};

export const Experience = ({ arMode }) => {
  const cameraControls = useRef();
  const { cameraZoomed } = useChat();
  const avatarRef = useRef();
  const [avatarPosition, setAvatarPosition] = useState([0, 0, -1]);
  const [avatarPlaced, setAvatarPlaced] = useState(false);
  const [tempPosition, setTempPosition] = useState([0, 0, -1]);

  useEffect(() => {
    if (!arMode) {
      // Resetear posición del avatar cuando se desactiva AR
      setAvatarPlaced(false);
      setAvatarPosition([0, 0, -1]);
      setTempPosition([0, 0, -1]);
      if (cameraControls.current) {
        cameraControls.current.setLookAt(0, 2, 5, 0, 1.5, 0);
      }
    }
  }, [arMode]);

  useEffect(() => {
    if (!arMode && cameraControls.current) {
      if (cameraZoomed) {
        cameraControls.current.setLookAt(0, 1.5, 1.5, 0, 1.5, 0, true);
      } else {
        cameraControls.current.setLookAt(0, 2.2, 5, 0, 1.0, 0, true);
      }
    }
  }, [cameraZoomed, arMode]);

  // Función para colocar avatar cuando el usuario toca la pantalla
  const handleTouch = () => {
    if (arMode && !avatarPlaced) {
      // Fijar la posición actual cuando el usuario toca
      setAvatarPosition([...tempPosition]);
      setAvatarPlaced(true);
    }
  };

  useEffect(() => {
    if (arMode) {
      window.addEventListener('click', handleTouch);
      window.addEventListener('touchend', handleTouch);
      return () => {
        window.removeEventListener('click', handleTouch);
        window.removeEventListener('touchend', handleTouch);
      };
    }
  }, [arMode, avatarPlaced, tempPosition]);

  return (
    <>
      {!arMode && <CameraControls ref={cameraControls} />}
      {arMode && (
        <ARHitTest 
          onPositionUpdate={setTempPosition} 
          avatarPlaced={avatarPlaced} 
        />
      )}
      {arMode ? (
        <>
          {/* Luz ambiental para AR - más suave para que se vea bien sobre la cámara */}
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
        </>
      ) : (
        <>
          {/* Ambiente tecnológico con luces azules */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 8, 5]} intensity={0.6} color="#ffffff" />
          <directionalLight position={[-5, 3, -5]} intensity={0.4} color="#00d4ff" />
          <pointLight position={[0, 5, 0]} color={0x00d4ff} intensity={0.3} distance={15} />
          <fog attach="fog" args={[0x0a1a2e, 8, 20]} />
          <ContactShadows opacity={0.2} />
        </>
      )}
      {/* Escenario tecnológico (solo cuando no está en AR) */}
      {!arMode && <TechScene arMode={arMode} />}
      
      {/* Wrapping Dots into Suspense to prevent Blink when Troika/Font is loaded */}
      <Suspense>
        <Dots position-y={1.75} position-x={-0.02} />
      </Suspense>
      
      {/* Avatar con efecto de holograma (solo cuando no está en AR) */}
      {arMode ? (
        <group 
          ref={avatarRef}
          position={
            avatarPlaced ? avatarPosition : tempPosition
          }
        >
          <Avatar />
        </group>
      ) : (
        <HologramWrapper>
          <group 
            ref={avatarRef}
            position={[0, 0, 0]}
          >
            <Avatar />
          </group>
        </HologramWrapper>
      )}
      {arMode && !avatarPlaced && (
        <Text
          position={[0, 1.5, -1]}
          fontSize={0.1}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          Mueve el dispositivo y toca para colocar a Emma
        </Text>
      )}
    </>
  );
};
