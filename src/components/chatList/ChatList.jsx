import React, { useEffect, useState, useRef } from "react";
import Logout from "../../../public/images/logout.png";

export default function ChatList({
  usuarios,
  alSeleccionar,
  miNombre,
  miId,
  misContactosIds,
  socket,
  novedades = [],
  onLogout,
}) {
  const [isWithoutText, setIsWithoutText] = useState(false);
  const [msgIfCopyOrNotCopy, setmsgIfCopyOrNotCopy] = useState("");
  const textCopyorNotCopy = useRef(null);
  const [isCopyVisible, setIsCopyVisible] = useState(false);

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

  const esDesktop = () => {
    return !/Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
      navigator.userAgent
    );
  };

  const compartirEnlace = async () => {
    const enlace = `${window.location.origin}?invite=${miId}`;

    const shareData = {
      title: "Mi Chat",
      text: "¡Hablemos por este chat!",
      url: enlace,
    };

    if (esDesktop()) {
      try {
        await navigator.clipboard.writeText(enlace);
        mostrarMensajeCopiado("Enlace copiado al portapapeles");
        //alert("Enlace copiado al portapapeles");
      } catch (err) {
        console.error("Error al copiar el enlace:", err);
        mostrarMensajeCopiado("No se pudo copiar el enlace");
        //alert("No se pudo copiar el enlace");
      }
    } else {
      if (navigator.share) {
        try {
          await navigator.share(shareData);
        } catch (err) {
          console.log("El usuario canceló o hubo un error:", err);
        }
      } else {
        try {
          await navigator.clipboard.writeText(enlace);
          mostrarMensajeCopiado("No es posible compartir, enlace copiado");
          //alert("No es posible compartir, enlace copiado");
        } catch (err) {
          console.error("Error al copiar:", err);
        }
      }
    }
  };

  const mostrarMensajeCopiado = (texto, tiempo = 2000) => {
    setmsgIfCopyOrNotCopy(texto);
    setIsCopyVisible(false);

    setTimeout(() => {
      setIsCopyVisible(true);
    }, 50);

    clearTimeout(mostrarMensajeCopiado._timeout);
    mostrarMensajeCopiado._timeout = setTimeout(() => {
      setIsCopyVisible(false);
      setmsgIfCopyOrNotCopy("");
    }, tiempo);
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
        <h2 className="fs-3 title-chats">Mis Conversaciones</h2>
        {msgIfCopyOrNotCopy && (
          <p
            className={`copy-msg fs-1 br-1 pd-2 ${
              isCopyVisible ? "visible" : ""
            }`}
            ref={textCopyorNotCopy}
          >
            {msgIfCopyOrNotCopy}
          </p>
        )}

        <button
          onClick={onLogout}
          className="btn-logout fs-1 flex-row align-center justify-end"
          title="Cerrar Sesión"
        >
          <span className="text fs-half">Cerrar sesión</span>
          <img src={Logout} alt="logout" className="picture"/>
        </button>

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
          chatsActivos.map((u) => {
            // --- LÓGICA DE NOVEDAD ---
            const tieneNovedad = novedades.includes(u._id);

            return (
              <li
                key={u._id}
                onClick={() => alSeleccionar(u)}
                className="user-item pd-2 mb-half br-1 fs-2 flex-row justify-between align-center"
              >
                <strong>{u.username}</strong>
                <span className="go fs-1">{">"}</span>

                {tieneNovedad && (
                  <span className="badge-new fs-1 pd-1 br-1">
                    Mensajes nuevos
                  </span>
                )}
              </li>
            );
          })
        ) : (
          <p className="pd-1">Buscando chats...</p>
        )}
      </ul>
    </div>
  );
}
