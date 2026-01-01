import React, { useEffect, useState, useRef } from "react";
import Logout from "../../assets/images/logout.png";
import AvatarDefault from "../../assets/images/user.png";
import LoadingSpinner from "../../subComponents/loadingSpinner/LoadingSpinner";

export default function ChatList({
  usuarios,
  alSeleccionar,
  miNombre,
  miId,
  misContactosIds,
  socket,
  novedades = [],
  onLogout,
  countsNovedades,
}) {
  const [isWithoutText, setIsWithoutText] = useState(false);
  const [msgIfCopyOrNotCopy, setmsgIfCopyOrNotCopy] = useState("");
  const textCopyorNotCopy = useRef(null);
  const [isCopyVisible, setIsCopyVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [emptyMessage, setEmptyMessage] = useState("Buscando chats...");
  const [loadingMessage, setLoadingMessage] = useState(true);

  // Cambiar titulo y notificacion
  useEffect(() => {
    const totalNovedades = Object.values(countsNovedades).reduce(
      (a, b) => a + b,
      0
    );

    const nombreApp = "Just Message";

    if (totalNovedades > 0) {
      document.title = `(${totalNovedades}) ${nombreApp}`;

      // LLAVE DE SEGURIDAD: Preguntamos si Notification existe en este navegador
      const soporteNotif = typeof window !== "undefined" && "Notification" in window;

      if (soporteNotif && Notification.permission === "granted") {
        const ultimoId = novedades[novedades.length - 1];
        const usuarioMsg = usuarios.find((u) => u._id === ultimoId);
        const textoNotif = usuarioMsg ? `Mensaje de ${usuarioMsg.username}` : "Nuevo mensaje";

        // Si hay Service Worker (Método pro)
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(textoNotif, {
              body: `Tienes ${totalNovedades} mensaje${totalNovedades > 1 ? "s" : ""} sin leer`,
              tag: "chat-notification",
              renotify: true,
              requireInteraction: true,
            });
          }).catch(() => {
            // Fallback si falla el SW
            new Notification(textoNotif, {
              body: `Tienes ${totalNovedades} mensaje${totalNovedades > 1 ? "s" : ""} sin leer`,
              tag: "chat-notification",
            });
          });
        } else {
          // Método simple si no hay SW
          new Notification(textoNotif, {
            body: `Tienes ${totalNovedades} mensaje${totalNovedades > 1 ? "s" : ""} sin leer`,
            tag: "chat-notification",
          });
        }
      }
    } else {
      document.title = nombreApp;
    }

    const limpiarTitulo = () => {
      document.title =
        totalNovedades > 0 ? `(${totalNovedades}) ${nombreApp}` : nombreApp;
    };

    window.addEventListener("focus", limpiarTitulo);
    return () => window.removeEventListener("focus", limpiarTitulo);
  }, [countsNovedades, novedades, usuarios]);

  useEffect(() => {
    const timerCincoSegundos = setTimeout(() => {
      setEmptyMessage("No se encontraron chats");
      setLoadingMessage(false);
    }, 1000);

    return () => clearTimeout(timerCincoSegundos);
  }, []);

  useEffect(() => {
    if (usuarios.length > 0 && miId) {
      usuarios.forEach((u) => {
        if (String(u._id) !== String(miId)) {
          socket.emit("get-chat", { withUserId: u._id });
        }
      });
    }

    const timer = setTimeout(() => setIsWithoutText(true), 3000);
    return () => clearTimeout(timer);
  }, [usuarios.length, miId]);

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
      } catch (err) {
        console.error("Error al copiar el enlace:", err);
        mostrarMensajeCopiado("No se pudo copiar el enlace");
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await fetch(
        "https://chatback-ily9.onrender.com/upload-avatar",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.url) {
        socket.emit("update-avatar", { url: data.url });
      }
    } catch (error) {
      console.error("Error al subir imagen:", error);
      alert("No se pudo actualizar el avatar");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const miUsuario = usuarios.find((u) => u._id === miId);
  const miAvatarProp = miUsuario?.avatar || AvatarDefault;

  return (
    <div className="chat-list-container pd-2 br-1">
      <div className="flex-row justify-between align-center mb-1">
        <button
          className={`btn-upload-image ${isUploading ? "loading" : ""}`}
          onClick={() => fileInputRef.current.click()}
          disabled={isUploading}
        >
          <img src={miAvatarProp} alt="upload" className="user-avatar" />
        </button>
        <h2 className="fs-3 title-chats">Chats</h2>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          style={{ display: "none" }}
          accept="image/*"
        />

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
          <img src={Logout} alt="logout" className="picture" />
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
        {loadingMessage ? (
          <>
            <p className="pd-1 text-searching">{emptyMessage}</p>
            <LoadingSpinner />
          </>
        ) : chatsActivos.length > 0 ? (
          chatsActivos.map((u) => {
            const tieneNovedad = novedades.includes(u._id);
            const cantidad = countsNovedades[u._id] || 0;

            return (
              <li
                key={u._id}
                onClick={() => alSeleccionar(u)}
                className="user-item pd-2 mb-half br-1 fs-2 flex-row justify-between align-center"
              >
                <img src={u.avatar} className="chat-avatar" />
                <strong>{u.username}</strong>

                <span className="go fs-1">{">"}</span>

                {tieneNovedad && (
                  <p className="badge-new fs-1 pd-1 br-1">
                    <span className="count-news fs-1">{`${cantidad} `} </span>
                    <span className="count-news-text fs-1">
                      Mensajes nuevos
                    </span>
                  </p>
                )}
              </li>
            );
          })
        ) : (
          <p className="pd-1 text-searching">{emptyMessage}</p>
        )}
      </ul>
    </div>
  );
}
