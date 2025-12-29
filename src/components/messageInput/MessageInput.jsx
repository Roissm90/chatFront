import { useState, useRef, useEffect } from "react";

export default function MessageInput({
  enviarMensaje,
  onTyping,
  onEnviarArchivo,
}) {
  const [mensaje, setMensaje] = useState("");
  const textareaRef = useRef(null);
  const initialHeight = window.innerWidth <= 767 ? 36 : 56;
  const [typing, setTyping] = useState(false);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  const iniciarTimerApagado = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setTyping(false);
      onTyping(false);
    }, 5000);
  };

  const handleSubmit = () => {
    if (!mensaje.trim()) return;
    enviarMensaje(mensaje);
    setMensaje("");
    setTyping(false);
    onTyping(false);
    if (timerRef.current) clearTimeout(timerRef.current);

    if (textareaRef.current) {
      textareaRef.current.style.height = `${initialHeight}px`;
    }
  };

  const handleFocus = () => {
    if (mensaje.length > 0) {
      onTyping(true);
      setTyping(true);
    }
  };

  const handleBlur = () => {
    if (typing) {
      iniciarTimerApagado();
    }
  };

  const handleChange = (e) => {
    const valor = e.target.value;
    setMensaje(valor);

    if (valor.length > 0) {
      if (!typing) {
        setTyping(true);
        onTyping(true);
      }
      iniciarTimerApagado();
    } else {
      setTyping(false);
      onTyping(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    const textarea = textareaRef.current;
    textarea.style.height = `${initialHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = `${initialHeight}px`;
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [initialHeight]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (onEnviarArchivo) {
      await onEnviarArchivo(file);
    }

    e.target.value = "";
  };

  return (
    <div className="message-input flex-row align-center justify-between">
      <button
        className="add-file-button"
        onClick={() => fileInputRef.current.click()}
        type="button"
      >
      </button>
      <input
        className="add-file"
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*,.pdf"
      />
      <textarea
        ref={textareaRef}
        value={mensaje}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
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
        style={{
          overflow: "hidden",
          resize: "none",
          height: `${initialHeight}px`,
        }}
        id="textareaMsg"
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
