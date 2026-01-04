import { useEffect, useRef, useState, useLayoutEffect } from "react";
import Delete from "../../assets/images/delete.png";
import Edit from "../../assets/images/edit.png";
import Doc from "../../assets/images/doc.png";
import Arrow from "../../assets/images/arrow.png";
import LoadingSpinner from "../../subComponents/loadingSpinner/LoadingSpinner";

export default function MessageList({
  mensajes = [],
  username,
  onDelete,
  onEdit,
}) {
  const listRef = useRef(null);
  const totalPrevio = useRef(0);

  const [isToDelete, setIsToDelete] = useState(null);
  const [isToEdit, setIsToEdit] = useState(null);
  const [nuevoTexto, setNuevoTexto] = useState("");
  const [activeMessages, setActiveMessages] = useState({});
  const [newMsgs, setNewMsgs] = useState(false);
  const [deberiaBajar, setDeberiaBajar] = useState(false);

  const textAreaEditRef = useRef(null);
  const initialHeight = 32;

  const scrollBottomWithBtn = () => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
    setNewMsgs(false);
  };

  const handleScroll = () => {
    const list = listRef.current;
    if (!list) return;

    const margin = 50;
    const isDown =
      list.scrollTop + list.clientHeight >= list.scrollHeight - margin;

    if (isDown && newMsgs) {
      setNewMsgs(false);
    }
  };

  const handleDownload = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;

      const fileName = url.split("/").pop() || "archivo-descargado";
      link.setAttribute("download", fileName);

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Error al descargar el archivo:", error);
      window.open(url, "_blank");
    }
  };

  // 1. CAPTURA: Detecta si debe bajar antes de que el DOM se actualice visualmente
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || mensajes.length === 0) return;

    const esCargaInicial = totalPrevio.current === 0;
    const esBorrado = mensajes.length < totalPrevio.current;

    if (esBorrado) {
      totalPrevio.current = mensajes.length;
      return;
    }

    // Margen para detectar si el usuario está al final
    const margin = 150; 
    const wasDown = list.scrollTop + list.clientHeight >= list.scrollHeight - margin;
    
    const lastMsg = mensajes[mensajes.length - 1];
    const mine = lastMsg?.user === username;

    if (esCargaInicial || mine || wasDown) {
      setDeberiaBajar(true);
      setNewMsgs(false);
    } else {
      setDeberiaBajar(false);
      setNewMsgs(true);
    }

    totalPrevio.current = mensajes.length;
  }, [mensajes.length, username]);

  // 2. ACCIÓN: Realiza el scroll cuando el nuevo mensaje ya está renderizado
  useEffect(() => {
    if (deberiaBajar && listRef.current) {
      const list = listRef.current;
      const esCargaInicial = totalPrevio.current <= 1;

      const timeoutId = setTimeout(() => {
        list.scrollTo({
          top: list.scrollHeight,
          behavior: esCargaInicial ? "auto" : "smooth",
        });
        setDeberiaBajar(false);
      }, 60);

      return () => clearTimeout(timeoutId);
    }
  }, [deberiaBajar, mensajes.length]);

  // 3. EFECTO DE ANIMACIÓN DE ENTRADA (TRADUCCIÓN)
  useEffect(() => {
    mensajes.forEach((m) => {
      const id = m._id || m.timestamp;
      if (!activeMessages[id]) {
        setTimeout(() => {
          setActiveMessages((prev) => ({ ...prev, [id]: true }));
        }, 100);
      }
    });
  }, [mensajes]);

  // 4. AUTO-AJUSTE TEXTAREA EDICIÓN
  useEffect(() => {
    if (isToEdit && textAreaEditRef.current) {
      const textarea = textAreaEditRef.current;
      textarea.style.height = `${initialHeight}px`;
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [nuevoTexto, isToEdit]);

  return (
    <div
      ref={listRef}
      className="message-list"
      style={{ overflowY: "auto" }}
      onScroll={handleScroll}
    >
      {newMsgs && (
        <button
          className="down-btn flex-row align-center justify-center"
          title="bajar abajo"
          onClick={scrollBottomWithBtn}
        >
          <img src={Arrow} alt="flecha abajo" />
        </button>
      )}
      {mensajes.map((m, i) => {
        const content = m.text || "";
        const esArchivo = content.startsWith("FILE_URL:");
        const estaCargando = content === "Subiendo archivo...";
        const url = esArchivo ? content.replace("FILE_URL:", "") : null;
        const msgId = m._id || i;
        const isTranslated = activeMessages[msgId];

        let tipoContenido = "texto";
        if (estaCargando) {
          tipoContenido = "loading";
        } else if (esArchivo) {
          if (/\.(jpeg|jpg|gif|png|webp)$/i.test(url)) {
            tipoContenido = "imagen";
          } else if (/\.(mov|mp4|webm|ogg)$/i.test(url)) {
            tipoContenido = "video";
          } else {
            tipoContenido = "documento";
          }
        }

        return (
          <div
            key={m._id || `${m.timestamp}-${i}`}
            className={`message ${m.user === username ? "user" : "other"} ${
              isTranslated ? "translated" : ""
            } br-1 pd-2 mb-half`}
          >
            <strong className="message-user mb-half fs-1">{m.user}</strong>

            {(() => {
              if (tipoContenido === "loading") {
                return (
                  <div className="flex-row justify-center pd-1">
                    <LoadingSpinner />
                  </div>
                );
              }

              if (tipoContenido === "imagen") {
                return (
                  <a
                    className="image-msg"
                    onClick={() => handleDownload(url)}
                    title="Clic para descargar"
                  >
                    <img
                      src={url}
                      alt="Imagen enviada"
                      className="msg-media br-1"
                    />
                  </a>
                );
              }

              if (tipoContenido === "video") {
                return (
                  <video
                    src={url}
                    controls
                    className="msg-media-video br-1"
                  ></video>
                );
              }

              if (tipoContenido === "documento") {
                return (
                  <a
                    className="message-text link-pdf"
                    onClick={() => handleDownload(url)}
                    title="Clic para descargar"
                  >
                    <img src={Doc} className="picture" alt="pdf image" />
                    <span className="text-link-download-doc fs-2">
                      Click para descargar
                    </span>
                  </a>
                );
              }

              return <p className="message-text fs-2 mb-half">{content}</p>;
            })()}

            <span className="message-time fs-1">
              {m.timestamp
                ? new Date(m.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "--:--"}
            </span>

            {m.user === username && (
              <div className="wrapper-edit-delete flex-row align-center justify-center">
                {tipoContenido === "texto" && (
                  <button
                    className="edit"
                    onClick={() => {
                      setIsToEdit({ id: m._id, text: m.text });
                      setNuevoTexto(m.text);
                    }}
                  >
                    <img src={Edit} alt="edit image" className="picture" />
                  </button>
                )}

                <button className="delete" onClick={() => setIsToDelete(m._id)}>
                  <img src={Delete} alt="delete image" className="picture" />
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* MODAL DE BORRAR */}
      {isToDelete && (
        <div className="overlay-modal flex-row justify-center align-center">
          <div className="modal modal-delete br-1">
            <p className="question fs-2 pd-4">
              ¿Estás seguro que quieres borrar el mensaje?
            </p>
            <div className="wrapper-btns flex-row justify-between">
              <button
                className="btn pd-4"
                onClick={() => {
                  onDelete(isToDelete);
                  setIsToDelete(null);
                }}
              >
                <span className="text fs-2">Sí</span>
              </button>
              <button className="btn pd-4" onClick={() => setIsToDelete(null)}>
                <span className="text fs-2">No</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDITAR */}
      {isToEdit && (
        <div className="overlay-modal flex-row justify-center align-center">
          <div className="modal modal-edit br-1 flex-column justify-center">
            <div className="container-textarea pd-4">
              <textarea
                className="input-edit fs-2 pd-half"
                value={nuevoTexto}
                onChange={(e) => setNuevoTexto(e.target.value)}
                autoFocus
                id="edit-msg"
                ref={textAreaEditRef}
                style={{ minHeight: `${initialHeight}px` }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onEdit(isToEdit.id, nuevoTexto);
                    setIsToEdit(null);
                    setNuevoTexto("");
                  }
                }}
              />
            </div>

            <div className="wrapper-btns flex-row justify-between">
              <button
                className="btn pd-4"
                onClick={() => {
                  onEdit(isToEdit.id, nuevoTexto);
                  setIsToEdit(null);
                  setNuevoTexto("");
                }}
              >
                <span className="text fs-2">Modificar</span>
              </button>
              <button className="btn pd-4" onClick={() => setIsToEdit(null)}>
                <span className="text fs-2">Salir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}