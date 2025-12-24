import { useState, useEffect, useRef } from "react";
import Logo from "../../../public/images/logo_chat.png";

export default function UsernameForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [vibrateChat, setVibrateChat] = useState(false);
  const [vibrateInvite, setVibrateInvite] = useState(false);
  const [inviteDisabled] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("no-invite") === "true";
  });

  const modalRef = useRef(null);
  const inputTelefonoRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setVibrateChat(true);
      setTimeout(() => setVibrateChat(false), 1000);
      return;
    }
    onSubmit(name.trim());
  };

  const handleInviteOpen = () => {
    setTelefono("");
    setIsModalOpen(true);
  };

  const handleInviteClose = () => setIsModalOpen(false);

  const handleInviteSend = () => {
    if (!telefono.trim()) {
      setVibrateInvite(true);
      setTimeout(() => setVibrateInvite(false), 1000);
      return;
    }
    const urlActual = window.location.href;
    const mensaje = encodeURIComponent(
      `Habla conmigo a través de ${urlActual}?no-invite=true`
    );
    const link = `https://wa.me/+34${telefono}?text=${mensaje}`;
    window.open(link, "_blank");
    setIsModalOpen(false);
  };

  // Focus input teléfono al abrir modal
  useEffect(() => {
    if (isModalOpen && inputTelefonoRef.current) {
      inputTelefonoRef.current.focus();
    }
  }, [isModalOpen]);

  // Cerrar modal con ESC
  useEffect(() => {
    const handleEsc = (e) => e.key === "Escape" && handleInviteClose();
    if (isModalOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isModalOpen]);

  const handleOverlayClick = (e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      handleInviteClose();
    }
  };

  return (
    <div className="username-container">
      <div className="logo-container mb-2">
        <img src={Logo} alt="Chat Logo" className="picture-logo" />
      </div>

      <h2 className="title-form mb-1 pd-1 fs-3">¿Quién eres?</h2>

      <form
        onSubmit={handleSubmit}
        className="username-form flex-row align-center justify-between pd-2 mb-3"
      >
        <label
          className={`label-username br-1 pd-2 flex-row align-end justify-center ${
            vibrateChat ? "vibrate" : ""
          }`}
          htmlFor="username"
        >
          <span className="label-text fs-2">Alias:</span>
          <input
            type="text"
            placeholder="Ej: Santi"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="input-username fs-2 ml-half"
            id="username"
          />
        </label>
        <button className="submit pd-2 br-1 fs-2" type="submit">
          Chat
        </button>
      </form>

      {/*!inviteDisabled && (
        <>
          <h2 className="title-invite mb-2 pd-1 fs-3">
            ¿Quieres invitar a alguien?
          </h2>
          <button
            className="invite-button pd-2 br-1 fs-2"
            onClick={handleInviteOpen}
          >
            Invitar
          </button>
        </>
      )*/}
      
      {isModalOpen && (
        <div
          className="modal-overlay flex-row align-center justify-center"
          onClick={handleOverlayClick}
        >
          <div ref={modalRef} className="modal-content br-1 pd-2">
            <h2 className="title-modal fs-3 mb-1 pd-2">Invitar por WhatsApp</h2>
            <input
              type="text"
              placeholder="Ej: 612345678"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleInviteSend();
                }
              }}
              ref={inputTelefonoRef}
              className={`input-telf fs-2 mb-2 pd-2 ml-half br-1 ${
                vibrateInvite ? "vibrate" : ""
              }`}
            />
            <button
              className="close-btn pd-1 br-1 fs-2"
              onClick={handleInviteClose}
            ></button>
            <button
              className="invite-btn fs-2 mb-1 pd-2 ml-half br-1"
              onClick={handleInviteSend}
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
