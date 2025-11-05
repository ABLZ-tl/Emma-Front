import { useRef, useState, useEffect } from "react";
import { useChat } from "../hooks/useChat";
import { APP_VERSION as BASE_VERSION } from "../utils/version";

// Versión que se actualiza en cada hot reload en desarrollo
const getVersion = () => {
  if (import.meta.env.DEV) {
    // En desarrollo, genera una versión única en cada render
    // Esto asegura que cambie con cada hot reload
    return `dev-${Date.now().toString(36).slice(-6)}`;
  }
  return BASE_VERSION;
};

export const UI = ({ hidden, arMode, setArMode, ...props }) => {
  const input = useRef();
  const { 
    chat, 
    loading, 
    cameraZoomed, 
    setCameraZoomed, 
    message,
    transcribeAudio,
    conversationHistory,
    showHistory,
    setShowHistory,
  } = useChat();
  
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  
  // Versión que se actualiza en cada render en desarrollo
  const [appVersion, setAppVersion] = useState(getVersion());
  
  // En desarrollo, actualizar versión cuando hay cambios (hot reload)
  useEffect(() => {
    if (import.meta.env.DEV) {
      setAppVersion(getVersion());
    }
  });

  // Inicializar contexto de audio en la primera interacción (importante para iOS)
  // NO bloquear - hacer de forma asíncrona en background
  const initializeAudioOnFirstInteraction = () => {
    if (!window.audioContextInitialized) {
      // Marcar inmediatamente para evitar múltiples intentos
      window.audioContextInitialized = true;
      
      // Inicializar en background sin bloquear
      (async () => {
        try {
          // Crear un audio silencioso para activar el contexto
          const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
          silentAudio.volume = 0.01;
          silentAudio.setAttribute('playsinline', 'true');
          silentAudio.setAttribute('webkit-playsinline', 'true');
          
          // Intentar reproducir y pausar inmediatamente
          await silentAudio.play();
          silentAudio.pause();
          silentAudio.currentTime = 0;
          
          console.log('Contexto de audio inicializado para iOS');
        } catch (error) {
          console.warn('No se pudo inicializar contexto de audio:', error);
          // No importa si falla, continuar de todos modos
        }
      })();
    }
  };

  const sendMessage = async (text) => {
    if (!loading && !message && text) {
      // Inicializar audio en la primera interacción (NO bloquear - hacer en background)
      initializeAudioOnFirstInteraction();
      
      // No esperar a la inicialización - continuar inmediatamente
      await chat(text);
      if (input.current) {
        input.current.value = "";
      }
    }
  };

  const handleSend = () => {
    const text = input.current?.value;
    if (text) {
      sendMessage(text);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      // Detener grabación
      stopRecording();
    } else {
      // Inicializar audio en la primera interacción (NO bloquear - hacer en background)
      initializeAudioOnFirstInteraction();
      
      // No esperar - iniciar grabación inmediatamente
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        // Limpiar el stream (usar el stream del closure)
        stream.getTracks().forEach(track => track.stop());
        setAudioStream(null);
        
        // Verificar que el blob tenga contenido
        if (blob.size === 0) {
          console.warn("El audio grabado está vacío");
          return;
        }
        
        try {
          console.log(`Audio grabado, tamaño: ${blob.size} bytes`);
          const transcribedText = await transcribeAudio(blob);
          
          if (transcribedText && transcribedText.trim()) {
            if (input.current) {
              input.current.value = transcribedText;
              sendMessage(transcribedText);
            }
          } else {
            console.warn("La transcripción está vacía");
            alert("No se pudo transcribir el audio. Intenta hablar más claro o más cerca del micrófono.");
          }
        } catch (error) {
          console.error("Error:", error);
          const errorMessage = error.message || "Error al transcribir el audio";
          alert(`Error: ${errorMessage}. Verifica que el backend esté corriendo y que tengas conexión a internet.`);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioStream(stream);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accediendo al micrófono:", error);
      alert("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mediaRecorder, isRecording, audioStream]);
  if (hidden) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bottom-0 z-10 flex justify-between p-3 sm:p-4 flex-col pointer-events-none">
        {/* Controles superiores */}
        <div className="w-full flex flex-row items-start justify-end gap-2 sm:gap-3">
          <button
            onClick={() => setCameraZoomed(!cameraZoomed)}
            className="pointer-events-auto bg-gradient-to-br from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-white p-3 sm:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 border border-blue-500/30"
            title={cameraZoomed ? "Acercar cámara" : "Alejar cámara"}
          >
            {cameraZoomed ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 sm:w-6 sm:h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 sm:w-6 sm:h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
                />
              </svg>
            )}
          </button>
          <button
            onClick={async () => {
              if (!arMode) {
                // Verificar disponibilidad de XR antes de activar
                if (navigator.xr) {
                  try {
                    const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
                    if (isSupported) {
                      setArMode(true);
                    } else {
                      alert('AR no está disponible en este dispositivo. Necesitas un dispositivo con soporte AR (como un teléfono móvil con Android/iOS).');
                    }
                  } catch (error) {
                    console.error('Error verificando soporte AR:', error);
                    alert('No se pudo verificar el soporte AR. Asegúrate de usar HTTPS y un navegador compatible.');
                  }
                } else {
                  alert('WebXR no está disponible en este navegador. Prueba con Chrome en Android o Safari en iOS con iOS 12+.');
                }
              } else {
                // Desactivar modo AR
                setArMode(false);
              }
            }}
            className={`pointer-events-auto p-3 sm:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 border ${
              arMode 
                ? "bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 ring-4 ring-green-300 border-green-400/30" 
                : "bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 border-blue-400/30"
            } text-white`}
            title={arMode ? "Desactivar AR" : "Activar AR"}
          >
            {arMode ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 sm:w-6 sm:h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5 sm:w-6 sm:h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Barra de entrada de mensajes */}
        <div className="flex items-end gap-2 sm:gap-3 pointer-events-auto max-w-screen-lg w-full mx-auto px-2 sm:px-4">
          {/* Botón de historial */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`bg-gradient-to-br from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 text-white p-3 sm:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 border border-slate-500/30 ${
              showHistory ? 'ring-2 ring-blue-400 ring-offset-2' : ''
            }`}
            title="Ver historial"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Contenedor de input y botones */}
          <div className="flex-1 flex items-end gap-2 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 p-2 sm:p-3">
            {/* Botón de grabación */}
            <button
              onClick={toggleRecording}
              className={`p-3 sm:p-4 rounded-full transition-all duration-300 transform hover:scale-110 active:scale-95 shadow-lg border ${
                isRecording 
                  ? "bg-gradient-to-br from-red-600 to-red-700 animate-pulse ring-4 ring-red-400 border-red-400/30" 
                  : "bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border-blue-400/30"
              } text-white`}
              title={isRecording ? "Grabando... Click para detener y enviar" : "Click para empezar a grabar"}
            >
              {isRecording ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <circle cx="12" cy="12" r="4" fill="currentColor"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              )}
            </button>

            {/* Input de texto */}
            <input
              className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder:text-gray-500 text-sm sm:text-base py-2 sm:py-3 px-2 sm:px-4 font-medium"
              placeholder="Escribe un mensaje..."
              ref={input}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading || message}
            />

            {/* Botón de enviar */}
            <button
              disabled={loading || message}
              onClick={handleSend}
              className={`bg-gradient-to-br from-blue-700 to-blue-900 hover:from-blue-600 hover:to-blue-800 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 active:scale-95 border border-blue-500/30 ${
                loading || message ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              )}
            </button>
          </div>
        </div>
        
        {/* Panel de historial mejorado */}
        {showHistory && (
          <div className="fixed bottom-24 sm:bottom-28 left-2 right-2 sm:left-4 sm:right-4 max-w-2xl mx-auto bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 max-h-[60vh] sm:max-h-96 overflow-hidden flex flex-col pointer-events-auto z-20 animate-in slide-in-from-bottom-5 duration-300">
            {/* Header del historial */}
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-2 rounded-full border border-blue-500/30">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-white">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-lg sm:text-xl text-gray-800">Historial de Conversación</h3>
                  <p className="text-xs text-gray-600 font-medium">{conversationHistory.length} mensajes</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del historial con scroll */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
              {conversationHistory.length === 0 ? (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-300 mx-auto mb-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                  </svg>
                  <p className="text-gray-500 text-sm">No hay historial aún</p>
                  <p className="text-gray-400 text-xs mt-1">Comienza una conversación para ver el historial aquí</p>
                </div>
              ) : (
                conversationHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm border ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-br-sm border-blue-500/30' 
                        : 'bg-gradient-to-br from-white to-gray-50 text-gray-800 rounded-bl-sm border-gray-200'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${
                          msg.role === 'user' ? 'text-blue-100' : 'text-gray-600'
                        }`}>
                          {msg.role === 'user' ? '👤 Tú' : '🤖 Emma - Asistente Banamex'}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Indicador de versión - muy pequeño y discreto */}
      <div className="fixed bottom-2 left-2 z-50 pointer-events-none">
        <div className="bg-black/30 backdrop-blur-sm text-white/60 text-[9px] px-1.5 py-0.5 rounded font-mono opacity-60 hover:opacity-100 transition-opacity">
          {appVersion}
        </div>
      </div>
    </>
  );
};
