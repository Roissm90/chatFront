import { useEffect, useState } from "react";
import MessageList from "../messageList/MessageList";
import MessageInput from "../messageInput/MessageInput";

export default function Chat({ socket, username, selectedUser, onBack, onContactFound }) {
  const [mensajes, setMensajes] = useState([]);

  useEffect(() => {
    if (!selectedUser) return;

    // Pedir historial al servidor
    socket.emit("get-chat", { withUserId: selectedUser._id });

    const hHistorial = (msgs) => {
      setMensajes(msgs || []);
      if (msgs?.length > 0) onContactFound(selectedUser._id);
    };

    const hMensaje = (msg) => {
      // Mantenemos tu efecto de 50ms
      setTimeout(() => {
        setMensajes((prev) => {
          // IMPORTANTE: Comprobamos si el mensaje ya está para no duplicar
          const existe = prev.some(m => m._id === msg._id || (m.timestamp === msg.timestamp && m.text === msg.text));
          if (existe) return prev;
          
          return [...prev, msg];
        });
        
        // Notificamos que hay un nuevo contacto/mensaje
        onContactFound(selectedUser._id);
      }, 50);
    };

    socket.on("historial", hHistorial);
    socket.on("mensaje", hMensaje);

    return () => {
      socket.off("historial", hHistorial);
      socket.off("mensaje", hMensaje);
    };
    // Añadimos las dependencias necesarias para que el listener se actualice si cambian
  }, [selectedUser, socket, onContactFound]); 

  const enviarMensaje = (texto) => {
    if (!texto.trim()) return;
    socket.emit("mensaje", { text: texto, toUserId: selectedUser._id });
  };

  return (
    <div className="chat-container">
      <div className="chat-header flex-row justify-between align-center pd-2">
        <h3 className="fs-3 title-chat">{selectedUser.username}</h3>
        <button onClick={onBack} className="btn-back pd-2">←</button>
      </div>
      <MessageList mensajes={mensajes} username={username} />
      <MessageInput enviarMensaje={enviarMensaje} />
    </div>
  );
}