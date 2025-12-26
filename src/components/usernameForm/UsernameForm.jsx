import { useState, useEffect, useRef } from "react";
import Logo from "../../../public/images/logo_chat.png";
import Hide from "../../../public/images/hide.png";
import NoHide from "../../../public/images/no_hide.png";
import Info from "../../../public/images/info.png";

export default function UsernameForm({ onSubmit, socket }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorServer, setErrorServer] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [isInfoVisible, setInfoVisible] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [vibrateChat, setVibrateChat] = useState(false);
  const [vibrateInvite, setVibrateInvite] = useState(false);
  const [inviteDisabled] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("no-invite") === "true";
  });

  const modalRef = useRef(null);
  const inputTelefonoRef = useRef(null);
  const timerPasswordRef = useRef(null);
  const timerInfoRef = useRef(null);

  const togglePasswordVisibility = () => {
    if (timerPasswordRef.current) clearTimeout(timerPasswordRef.current);

    setPasswordVisible(true);

    timerPasswordRef.current = setTimeout(() => {
      setPasswordVisible(false);
    }, 3000);
  };

  const showInfo = () => {
    if (timerInfoRef.current) clearTimeout(timerInfoRef.current);
    if (isInfoVisible) {
      setInfoVisible(false);
      return;
    }
    setInfoVisible(true);

    timerInfoRef.current = setTimeout(() => {
      setInfoVisible(false);
    }, 3000);
  };

  // Escuchar errores de validación del servidor
  useEffect(() => {
    socket.on("user-error", (msg) => {
      setErrorServer(msg);
      setVibrateChat(true);
      setTimeout(() => setVibrateChat(false), 1000);
    });
    return () => socket.off("user-error");
  }, [socket]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorServer(""); // Limpiar errores previos
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // COMANDO SECRETO BORRAR
    if (trimmedName === "RESET_CHAT_ALL") {
      socket.emit("reset-all-chats");
      alert("✅ Todas las conversaciones han sido borradas!");
      setName("");
      setEmail("");
      return;
    }

    if (!trimmedName || !trimmedEmail || !password) {
      setVibrateChat(true);
      setTimeout(() => setVibrateChat(false), 1000);
      return;
    }

    onSubmit(trimmedName, trimmedEmail, password);
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

  useEffect(() => {
    if (isModalOpen && inputTelefonoRef.current) {
      inputTelefonoRef.current.focus();
    }
  }, [isModalOpen]);

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

      {/* Mostrar error del servidor si existe */}
      {errorServer && (
        <p className="error-banner fs-1 pd-2">{`*${errorServer}`}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="username-form flex-column pd-2 mb-3"
      >
        <div className="wrapper-form flex-row align-start justify-between">
          <div className="wrapper-labels flex-column">
            <label
              className={`label-username br-1 pd-2 flex-row align-end justify-start ${
                vibrateChat ? "vibrate" : ""
              }`}
              htmlFor="username"
            >
              <span className="label-text fs-2">Alias:</span>
              <input
                type="text"
                placeholder="User90"
                maxLength={10}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-username fs-2 ml-half"
                id="username"
              />
            </label>

            <label
              className={`label-username br-1 pd-2 flex-row align-end justify-start ${
                vibrateChat ? "vibrate" : ""
              }`}
              htmlFor="email"
            >
              <span className="label-text fs-2">Email:</span>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-username fs-2 ml-half"
                id="email"
              />
            </label>

            <label
              className={`label-username br-1 pd-2 flex-row align-end justify-start ${
                vibrateChat ? "vibrate" : ""
              }`}
              htmlFor="password"
            >
              <div class="wrapper-info flex-row align-center justify-center">
                <img
                  onClick={showInfo}
                  src={Info}
                  className="info-picture"
                  alt="info picture"
                />
                {isInfoVisible && (
                  <p class="info-text fs-1 pd-2 br-half">
                    La contraseña debe tener al menos{" "}
                    <strong>
                      6 caracteres, al menos 1 letra mayúscula, al menos 1
                      número y al menos 1 carácter especial: @$!%*?&
                    </strong>
                  </p>
                )}
              </div>

              <span className="label-text fs-2">Contraseña:</span>
              <input
                type={isPasswordVisible ? "text" : "password"}
                placeholder="******"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-username fs-2 ml-half"
                id="password"
              />
              <img
                onClick={togglePasswordVisibility}
                src={isPasswordVisible ? NoHide : Hide}
                className="hide-picture"
                alt={isPasswordVisible ? "visible image" : "invisible image"}
              />
            </label>
          </div>
          <button className="submit pd-2 br-1 fs-2" type="submit">
            Chat
          </button>
        </div>
      </form>

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
