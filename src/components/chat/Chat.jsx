import { useEffect, useState, useRef } from "react";
import MessageList from "../messageList/MessageList";
import MessageInput from "../messageInput/MessageInput";
import AvatarDefault from "../../../public/images/user.png";

export default function Chat({
  socket,
  username,
  selectedUser,
  onBack,
  onContactFound,
}) {
  const [mensajes, setMensajes] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isUploading] = useState(false); 
  const fileInputRef = useRef(null);
  const [online, setOnline] = useState(false);

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
          const existe = prev.some(
            (m) =>
              m._id === msg._id ||
              (m.timestamp === msg.timestamp && m.text === msg.text)
          );
          if (existe) return prev;

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
  }, [selectedUser, socket, onContactFound]);

  useEffect(() => {
    if (!selectedUser || !socket) return;

    //console.log("🧐 Consultando estado de:", selectedUser.username, "ID:", selectedUser._id);
    socket.emit("check-online", { userId: selectedUser._id });

    const handleRespuestaOnline = ({ userId, estado }) => {
      //console.log(`Respuesta inicial: El usuario ${userId} está ${estado}`);
      if (String(userId) === String(selectedUser._id)) {
        setOnline(estado === "online");
      }
    };

    const handleUsuarioEstado = ({ userId, estado }) => {
      console.log(`🔔 Cambio en tiempo real: ${userId} ahora está ${estado}`);
      if (String(userId) === String(selectedUser._id)) {
        setOnline(estado === "online");
      }
    };

    socket.on("respuesta-online", handleRespuestaOnline);
    socket.on("usuario-estado", handleUsuarioEstado);

    return () => {
      socket.off("respuesta-online", handleRespuestaOnline);
      socket.off("usuario-estado", handleUsuarioEstado);
    };
  }, [selectedUser, socket]);

  const enviarMensaje = (texto) => {
    if (!texto.trim()) return;
    socket.emit("mensaje", { text: texto, toUserId: selectedUser._id });
  };

  const imagenAvatar = selectedUser?.avatar || AvatarDefault;

  const showModal = () => {
    if(!isModalOpen) setModalOpen(true);
  }

  const hideModal = () => {
    if(isModalOpen) setModalOpen(false);
  }

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains("modal-avatar")) {
      hideModal();
    }
  };

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === "Escape") hideModal();
    };

    if (isModalOpen) {
      window.addEventListener("keydown", handleEsc);
    }

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isModalOpen]);

  return (
    <div className="chat-container">
      <div className="chat-header flex-row justify-between align-center pd-2">
        <div className="flex-row align-end justify-between">
          <div className={`line ${online ? 'on' : 'off'}`}></div>
          <h3 className="fs-3 title-chat">{selectedUser?.username}</h3>

          <button 
            className={`btn-see-image`}
            onClick={showModal}
          >
            <img 
              src={imagenAvatar} 
              alt="contact-avatar" 
              className="user-avatar" 
            />
          </button>
        </div>
        <button onClick={onBack} className="btn-back pd-2">
          ←
        </button>
      </div>
      <MessageList mensajes={mensajes} username={username} />
      <MessageInput enviarMensaje={enviarMensaje} />
      {isModalOpen && (
        <div className="modal-avatar flex-row justify-center align-center" onClick={handleBackdropClick}>
          <img className="picture-avatar" src={imagenAvatar} alt={`imagen de ${selectedUser?.username}`}/>
        </div>
      )}
    </div>
  );
}