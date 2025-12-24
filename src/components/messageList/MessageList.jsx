import { useEffect, useRef } from "react";

export default function MessageList({ mensajes = [], username }) {
  const listRef = useRef(null);
  const totalPrevio = useRef(0);

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
          behavior: esCargaInicial ? "auto" : "smooth"
        });
      }, 60); 
    }

    totalPrevio.current = mensajes.length;
  }, [mensajes.length, username]);

  return (
    <div ref={listRef} className="message-list" style={{ overflowY: "auto" }}>
      {mensajes.map((m, i) => (
        <div 
          key={m._id || `${m.timestamp}-${i}`} 
          className={`message ${m.user === username ? "user" : "other"} br-1 pd-2 mb-half`}
        >
          <strong className="message-user mb-half fs-1">{m.user}</strong>
          <p className="message-text fs-2 mb-half">{m.text}</p>
          <span className="message-time fs-1">
            {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--:--"}
          </span>
        </div>
      ))}
    </div>
  );
}