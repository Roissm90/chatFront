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
  myId,
  decrypt,
  encrypt,
}) {
  const [mensajes, setMensajes] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [online, setOnline] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // GESTIÓN DE MENSAJES (HISTORIAL, NUEVOS, BORRAR Y EDITAR)
  useEffect(() => {
    if (!selectedUser) return;
    // Pedimos el chat al servidor
    socket.emit("get-chat", { withUserId: selectedUser._id });
    // Función: Recibir historial
    const hHistorial = (msgs) => {
      const mensajesDescifrados = (msgs || []).map((m) => ({
        ...m,
        text: decrypt(m.text),
      }));
      setMensajes(mensajesDescifrados || []);
      if (msgs?.length > 0) onContactFound(selectedUser._id);
    };
    // Función: Recibir un mensaje nuevo
    const hMensaje = (msg) => {
      const mensajeLimpio = { ...msg, text: decrypt(msg.text) };
      setMensajes((prev) => [...prev, mensajeLimpio]);
      if (String(msg.toUserId) === String(myId)) {
        socket.emit("marcar-visto", { messageId: msg._id });
      }
    };
    // BORRAR Y EDITAR EN TIEMPO REAL
    const hDelete = ({ messageId }) => {
      setMensajes((prev) => prev.filter((m) => m._id !== messageId));
    };
    const hEdit = ({ messageId, newText }) => {
      setMensajes((prev) =>
        prev.map((m) =>
          m._id === messageId ? { ...m, text: decrypt(newText) } : m
        )
      );
    };
    // Activamos todos los "oídos" del socket
    socket.on("historial", hHistorial);
    socket.on("mensaje", hMensaje);
    socket.on("message-deleted", hDelete);
    socket.on("message-edited", hEdit);
    // Limpieza al cerrar el componente para no duplicar eventos
    return () => {
      socket.off("historial", hHistorial);
      socket.off("mensaje", hMensaje);
      socket.off("message-deleted", hDelete);
      socket.off("message-edited", hEdit);
    };
  }, [selectedUser, socket, onContactFound, myId, decrypt]);

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
      //console.log(`🔔 Cambio en tiempo real: ${userId} ahora está ${estado}`);
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

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const hStart = ({ fromUserId }) => {
      if (fromUserId === selectedUser._id) setIsTyping(true);
    };
    const hStop = ({ fromUserId }) => {
      if (fromUserId === selectedUser._id) setIsTyping(false);
    };

    socket.on("usuario-escribiendo", hStart);
    socket.on("usuario-estado-deja-escribiendo", hStop);

    return () => {
      socket.off("usuario-escribiendo", hStart);
      socket.off("usuario-estado-deja-escribiendo", hStop);
    };
  }, [selectedUser, socket]);

  const enviarMensaje = (texto) => {
    if (!texto.trim()) return;

    const textoCifrado = encrypt(texto);
    socket.emit("mensaje", { text: textoCifrado, toUserId: selectedUser._id });
  };

  const manejarEscribiendo = (estaEscribiendo) => {
    if (estaEscribiendo) {
      socket.emit("escribiendo", { toUserId: selectedUser._id });
    } else {
      socket.emit("deja-escribiendo", { toUserId: selectedUser._id });
    }
  };

  const onDelete = (id) => {
    socket.emit("delete-message", {
      messageId: id,
      toUserId: selectedUser._id,
    });
  };

  const onEdit = (id, nuevoTexto) => {
    const textoCifrado = encrypt(nuevoTexto);
    socket.emit("edit-message", {
      messageId: id,
      newText: textoCifrado,
      toUserId: selectedUser._id,
    });
  };

  const imagenAvatar = selectedUser?.avatar || AvatarDefault;

  const showModal = () => {
    if (!isModalOpen) setModalOpen(true);
  };

  const hideModal = () => {
    if (isModalOpen) setModalOpen(false);
  };

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

  const onEnviarArchivo = async (archivo) => {
    try {
      // 1. Enviamos un mensaje de texto normal que sirve de "Placeholder"
      const textoCifradoSubiendo = encrypt("Subiendo archivo...");
      socket.emit("mensaje", {
        text: textoCifradoSubiendo,
        toUserId: selectedUser._id,
      });

      // 2. Creamos un "oído" temporal para capturar el ID que el servidor le asigne a ese mensaje
      const capturarID = async (msgCreado) => {
        // Verificamos que sea el mensaje que acabamos de enviar nosotros
        if (
          msgCreado.user === username &&
          decrypt(msgCreado.text) === "Subiendo archivo..."
        ) {
          // Dejamos de escuchar para no interferir con otros mensajes
          socket.off("mensaje", capturarID);

          // 3. Ahora que ya sabemos el ID real (_id) de ese mensaje, subimos el archivo
          const formData = new FormData();
          formData.append("archivo", archivo);

          const response = await fetch(
            "https://chatback-ily9.onrender.com/upload-file",
            {
              method: "POST",
              body: formData,
            }
          );
          const data = await response.json();

          if (data.url) {
            // 4. LANZAMOS LA EDICIÓN AUTOMÁTICA
            // Usamos el _id real que nos dio el servidor para que el div NO se borre
            const textoFinalCifrado = encrypt(`FILE_URL:${data.url}`);

            socket.emit("edit-message", {
              messageId: msgCreado._id, // ID real de MongoDB
              newText: textoFinalCifrado,
              toUserId: selectedUser._id,
            });
          }
        }
      };

      socket.on("mensaje", capturarID);
    } catch (error) {
      console.error("Error al enviar archivo:", error);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header flex-row justify-between align-center pd-2">
        <div className="flex-row align-end justify-between">
          <div className={`line ${online ? "on" : "off"}`}></div>
          <h3 className="fs-3 title-chat">{selectedUser?.username}</h3>

          <button className={`btn-see-image`} onClick={showModal}>
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
      <MessageList
        mensajes={mensajes}
        username={username}
        onDelete={onDelete}
        onEdit={onEdit}
      />
      <MessageInput
        enviarMensaje={enviarMensaje}
        onTyping={manejarEscribiendo}
        onEnviarArchivo={onEnviarArchivo}
      />
      {isModalOpen && (
        <div
          className="modal-avatar flex-row justify-center align-center"
          onClick={handleBackdropClick}
        >
          <img
            className="picture-avatar"
            src={imagenAvatar}
            alt={`imagen de ${selectedUser?.username}`}
          />
        </div>
      )}
      {isTyping && (
        <p className="is-typing fs-1" onClick={handleBackdropClick}>
          {`${selectedUser.username} está escribiendo`}
          <span className="points">
            <span className="point">.</span>
            <span className="point">.</span>
            <span className="point">.</span>
          </span>
        </p>
      )}
    </div>
  );
}
