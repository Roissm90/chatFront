import { useEffect, useState } from "react";
import MessageList from "../messageList/MessageList";
import MessageInput from "../messageInput/MessageInput";

export default function Chat({ socket, username, selectedUser, onBack, onContactFound }) {
  const [mensajes, setMensajes] = useState([]);

  useEffect(() => {
    if (!selectedUser) return;
    socket.emit("get-chat", { withUserId: selectedUser._id });

    const hHistorial = (msgs) => {
      setMensajes(msgs || []);
      if (msgs?.length > 0) onContactFound(selectedUser._id);
    };

    const hMensaje = (msg) => {
      setTimeout(() => {
        setMensajes((prev) => {
          if (prev.find(m => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        onContactFound(selectedUser._id);
      }, 50);
    };

    socket.on("historial", hHistorial);
    socket.on("mensaje", hMensaje);

    return () => {
      socket.off("historial", hHistorial);
      socket.off("mensaje", hMensaje);
    };
  }, [selectedUser, socket]);

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