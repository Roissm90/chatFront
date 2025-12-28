import { useEffect, useRef, useState } from "react";
import Delete from "../../../public/images/delete.png";
import Edit from "../../../public/images/edit.png";

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

  const textAreaEditRef = useRef(null);
  const initialHeight = 32;

  useEffect(() => {
    const list = listRef.current;
    if (!list || mensajes.length === 0) return;

    const esCargaInicial = totalPrevio.current === 0;
    const ultimoMsg = mensajes[mensajes.length - 1];
    const soyYo = ultimoMsg?.user === username;

    if (esCargaInicial || soyYo) {
      setTimeout(() => {
        list.scrollTo({
          top: list.scrollHeight,
          behavior: esCargaInicial ? "auto" : "smooth",
        });
      }, 60);
    }

    totalPrevio.current = mensajes.length;
  }, [mensajes.length, username]);

  useEffect(() => {
    if (isToEdit && textAreaEditRef.current) {
      const textarea = textAreaEditRef.current;
      textarea.style.height = `${initialHeight}px`;
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [nuevoTexto, isToEdit]);

  return (
    <div ref={listRef} className="message-list" style={{ overflowY: "auto" }}>
      {mensajes.map((m, i) => (
        <div
          key={m._id || `${m.timestamp}-${i}`}
          className={`message ${
            m.user === username ? "user" : "other"
          } br-1 pd-2 mb-half`}
        >
          <strong className="message-user mb-half fs-1">{m.user}</strong>
          <p className="message-text fs-2 mb-half">{m.text}</p>
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
              <button
                className="edit"
                onClick={() => {
                  setIsToEdit({ id: m._id, text: m.text });
                  setNuevoTexto(m.text);
                }}
              >
                <img src={Edit} alt="edit image" className="picture" />
              </button>
              <button className="delete" onClick={() => setIsToDelete(m._id)}>
                <img src={Delete} alt="delete image" className="picture" />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* MODAL DE BORRAR */}
      {isToDelete && (
        <div class="overlay-modal flex-row justify-center align-center">
          <div className="modal modal-delete br-1">
            <p className="question fs-2 mb-2">
              ¿Estás seguro que quieres borrar el mensaje?
            </p>
            <div className="wrapper-btns flex-row justify-between">
              <button
                className="btn"
                onClick={() => {
                  onDelete(isToDelete);
                  setIsToDelete(null);
                }}
              >
                <span className="text fs-1">Sí</span>
              </button>
              <button className="btn" onClick={() => setIsToDelete(null)}>
                <span className="text fs-1">No</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDITAR */}
      {isToEdit && (
        <div class="overlay-modal flex-row justify-center align-center">
          <div className="modal modal-edit br-1 flex-column justify-center">
            <textarea
              className="input-edit fs-2 mb-2 pd-half"
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
            <div className="wrapper-btns flex-row justify-between">
              <button
                className="btn"
                onClick={() => {
                  onEdit(isToEdit.id, nuevoTexto);
                  setIsToEdit(null);
                  setNuevoTexto("");
                }}
              >
                <span className="text fs-1">Modificar</span>
              </button>
              <button className="btn" onClick={() => setIsToEdit(null)}>
                <span className="text fs-1">Salir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
