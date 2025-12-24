import { useState, useRef, useEffect } from "react";

export default function MessageInput({ enviarMensaje }) {
  const [mensaje, setMensaje] = useState("");
  const textareaRef = useRef(null);
  const initialHeight = window.innerWidth <= 767 ? 36 : 56; 

  const handleSubmit = () => {
    if (!mensaje.trim()) return;
    enviarMensaje(mensaje);
    setMensaje("");

    if (textareaRef.current) {
      textareaRef.current.style.height = `${initialHeight}px`;
    }
  };

  const handleChange = (e) => {
    setMensaje(e.target.value);
    const textarea = textareaRef.current;

    textarea.style.height = `${initialHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = `${initialHeight}px`;
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  return (
    <div className="message-input">
      <textarea
        ref={textareaRef}
        value={mensaje}
        onChange={handleChange}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }
        }}
        placeholder="Escribe un mensaje..."
        className="input-message br-1 pd-2 fs-2"
        style={{ overflow: "hidden", resize: "none", height: `${initialHeight}px` }}
      />

      <button
        className="button-send-message br-1 pd-2 fs-2"
        onClick={handleSubmit}
      >
        Enviar
      </button>
    </div>
  );
}
