import React, { useEffect, useState } from "react";

export default function ChatList({
  usuarios,
  alSeleccionar,
  miNombre,
  miId,
  misContactosIds,
  socket,
}) {
  const [isWithoutText, setIsWithoutText] = useState(false);

  useEffect(() => {
    if (usuarios.length > 0) {
      usuarios.forEach((u) => {
        if (u.username !== miNombre) {
          socket.emit("get-chat", { withUserId: u._id });
        }
      });
    }

    const timer = setTimeout(() => setIsWithoutText(true), 3000);
    return () => clearTimeout(timer);
  }, [usuarios, socket, miNombre]);

  /*
  const copiarInvitacion = () => {
    navigator.clipboard.writeText(`${window.location.origin}?invite=${miId}`);
    alert("Link copiado");
  };
  */

  const compartirEnlace = async () => {
    const enlace = `${window.location.origin}?invite=${miId}`;
    
    const shareData = {
      title: "Mi Chat",
      text: "¡Hablemos por este chat!",
      url: enlace,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("El usuario canceló o hubo un error:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(enlace);
        alert("Menú de compartir no disponible. Enlace copiado al portapapeles ✅");
      } catch (err) {
        console.error("Error al copiar el enlace: ", err);
      }
    }
  };

  const handleMouseEnter = () => {
    if (window.innerWidth >= 768) setIsWithoutText(false);
  };

  const handleMouseLeave = () => {
    if (window.innerWidth >= 768) setIsWithoutText(true);
  };

  const chatsActivos = usuarios.filter(
    (u) => misContactosIds.includes(u._id) && u.username !== miNombre
  );

  return (
    <div className="chat-list-container pd-2 br-1">
      <div className="flex-row justify-between align-center mb-1">
        <h2 className="fs-3">Mis Conversaciones</h2>

        <button
          onClick={compartirEnlace}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`btn-invite pd-1 br-1 shadow`}
        >
          <span className={`add-text fs-1 ${isWithoutText ? "hide" : ""}`}>
            Invitar
          </span>
          <span className={`add-symbol`}></span>
        </button>
      </div>

      <ul className="list-users">
        {chatsActivos.length > 0 ? (
          chatsActivos.map((u) => (
            <li
              key={u._id}
              onClick={() => alSeleccionar(u)}
              className="user-item pd-2 mb-half br-1"
              style={{ cursor: "pointer" }}
            >
              <strong>{u.username}</strong>
            </li>
          ))
        ) : (
          <p className="pd-1">Buscando chats...</p>
        )}
      </ul>
    </div>
  );
}
