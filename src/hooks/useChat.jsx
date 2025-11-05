import { createContext, useContext, useEffect, useState } from "react";

// Configurar URL del backend según el entorno
const getBackendUrl = () => {
  // Si hay una variable de entorno definida, usarla
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Si estamos en producción (hostname contiene mdtch.mx), usar el servidor de producción
  if (typeof window !== 'undefined' && window.location.hostname.includes('mdtch.mx')) {
    return 'https://demo-ar-back.mdtch.mx';
  }
  
  // Por defecto, usar localhost para desarrollo
  return 'http://localhost:3000';
};

const backendUrl = getBackendUrl();

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  // Generar un ID de sesión único
  const [sessionId] = useState(() => {
    const stored = localStorage.getItem('chatSessionId');
    if (stored) return stored;
    const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatSessionId', newId);
    return newId;
  });

  const chat = async (message) => {
    setLoading(true);
    try {
      const data = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message, sessionId }),
      });
      
      if (!data.ok) {
        const errorData = await data.json().catch(() => ({ error: "Error desconocido" }));
        console.error("Error del servidor:", errorData);
        alert(`Error: ${errorData.message || errorData.error || "Error al procesar el mensaje"}`);
        setLoading(false);
        return;
      }
      
      const response = await data.json();
      const resp = response.messages || [];
      
      // Actualizar historial completo
      if (response.history) {
        setConversationHistory(response.history);
      }
      
      if (Array.isArray(resp)) {
        setMessages((messages) => [...messages, ...resp]);
      } else {
        console.error("La respuesta no contiene un array de mensajes:", response);
        alert("Error: La respuesta del servidor no es válida");
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      alert("Error al conectar con el servidor. Verifica que el backend esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    try {
      // Convertir blob a base64
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = reader.result.split(',')[1]; // Remover el prefijo data:audio/webm;base64,
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      console.log(`Enviando audio para transcripción, tamaño: ${audioBlob.size} bytes`);

      const response = await fetch(`${backendUrl}/transcribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ audioBase64: base64, sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Error desconocido" }));
        console.error("Error del servidor en transcripción:", errorData);
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Transcripción recibida:", data.text);
      return data.text;
    } catch (error) {
      console.error("Error transcribiendo audio:", error);
      throw error;
    }
  };

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const onMessagePlayed = () => {
    setMessages((messages) => {
      if (messages.length > 0) {
        const remaining = messages.slice(1);
        console.log(`Mensaje procesado. Mensajes restantes: ${remaining.length}`);
        return remaining;
      }
      return messages;
    });
  };
  
  const loadHistory = async () => {
    try {
      const response = await fetch(`${backendUrl}/history/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setConversationHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const nextMessage = messages[0];
      console.log(`Actualizando mensaje actual: ${messages.length} mensajes en cola`);
      setMessage(nextMessage);
    } else {
      setMessage(null);
    }
  }, [messages]);

  // Cargar historial al montar
  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        onMessagePlayed,
        loading,
        cameraZoomed,
        setCameraZoomed,
        transcribeAudio,
        conversationHistory,
        showHistory,
        setShowHistory,
        loadHistory,
        sessionId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
