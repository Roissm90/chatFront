import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import CryptoJS from "crypto-js";
import UsernameForm from "./components/usernameForm/UsernameForm";
import ChatList from "./components/chatList/ChatList";
import Chat from "./components/chat/Chat";
window.onerror = function (message, source, lineno) {
  alert("ERROR DETECTADO:\n" + message + "\nEn línea: " + lineno);
};

const MASTER_KEY = "CualquierCosaQueTengaNumerosYLetras123456!";
const socket = io("https://chatback-ily9.onrender.com");

export default function App() {
  const [username, setUsername] = useState(
    sessionStorage.getItem("username") || ""
  );
  const [email, setEmail] = useState(sessionStorage.getItem("userEmail") || "");

  const [password, setPassword] = useState(() => {
    const saved = sessionStorage.getItem("userP");
    return saved ? atob(saved) : "";
  });

  const [usuariosGlobales, setUsuariosGlobales] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [myId, setMyId] = useState("");
  const [misContactosIds, setMisContactosIds] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [countsNovedades, setCountsNovedades] = useState({});
  const [isNotifications, setIsNotifications] = useState(() => {
    // Verificamos si existe en el objeto window antes de usarlo
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission === "granted";
    }
    return false;
  });
  //refs para notis
  const isNotificationsRef = useRef(isNotifications);
  const selectedUserRef = useRef(selectedUser);
  const usuariosGlobalesRef = useRef(usuariosGlobales);

  useEffect(() => {
    isNotificationsRef.current = isNotifications;
  }, [isNotifications]);
  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);
  useEffect(() => {
    usuariosGlobalesRef.current = usuariosGlobales;
  }, [usuariosGlobales]);

  //useEffect para el tipo de notf SW
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("SW registrado con éxito"))
        .catch((err) => console.error("Fallo al registrar SW:", err));
    }
  }, []);

  const pedirPermisoNotificaciones = async () => {
    if (!("Notification" in window)) {
      setIsNotifications(false);
      alert("Tu navegador no soporta notificaciones.");
      return;
    }

    const permiso = await Notification.requestPermission();

    if (permiso === "granted") {
      if (isNotifications) {
        setIsNotifications(false);
        new Notification("Just Message", {
          body: "Notificaciones desactivadas",
          icon: "/logo_chat_icon.png",
        });
      } else {
        setIsNotifications(true);
        new Notification("Just Message", {
          body: "Notificaciones activadas",
          icon: "/logo_chat_icon.png",
        });
      }
    } else if (permiso === "denied") {
      setIsNotifications(false);
      alert(
        "Has bloqueado las notificaciones. Por favor, actívalas haciendo clic en el candado de la barra de direcciones."
      );
    }
  };

  const encrypt = (text) => CryptoJS.AES.encrypt(text, MASTER_KEY).toString();

  const decrypt = (cipherText) => {
    try {
      const bytes = CryptoJS.AES.decrypt(cipherText, MASTER_KEY);
      return bytes.toString(CryptoJS.enc.Utf8) || "[Error]";
    } catch {
      return "[Cifrado]";
    }
  };

  const seleccionarChat = (user) => {
    setSelectedUser(user);
    setNovedades((prev) => prev.filter((id) => id !== user._id));
    setCountsNovedades((prev) => ({
      ...prev,
      [user._id]: 0,
    }));

    socket.emit("marcar-chat-leido", { withUserId: user._id });
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setUsername("");
    setEmail("");
    setPassword("");
    setMyId("");
    setSelectedUser(null);
    setNovedades([]);
    setCountsNovedades({});
    socket.disconnect();
    socket.connect();
  };

  // 1. ESCUCHAR EVENTOS DEL SERVIDOR
  useEffect(() => {
    socket.on("init-session", (data) => {
      setMyId(data.userId);

      if (data.tempName && data.tempEmail) {
        setUsername(data.tempName);
        setEmail(data.tempEmail);
        sessionStorage.setItem("username", data.tempName);
        sessionStorage.setItem("userEmail", data.tempEmail);
      }
    });

    socket.on("user-error", (mensaje) => {
      //console.log("⚠️ ERROR DEL SERVIDOR:", mensaje);
      if (mensaje === "Contraseña incorrecta.") {
        sessionStorage.clear();
        setMyId("");
        setPassword("");
      }
    });

    socket.on("lista-usuarios-global", (users) => {
      setUsuariosGlobales(users);
    });

    return () => {
      socket.off("init-session");
      socket.off("user-error");
      socket.off("lista-usuarios-global");
    };
  }, []);

  // 2. COMANDO COMAND + E (Cerrar sesión)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        sessionStorage.clear();
        setUsername("");
        setEmail("");
        setPassword("");
        setMyId("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 3. LOGICA DE RECONEXIÓN AUTOMÁTICA (Usando la clave recuperada)
  useEffect(() => {
    if (username && email && password && !myId) {
      socket.emit("join", { username, email, password });
    }
  }, [username, email, password, myId]);

  // 4. HISTORIAL Y CONTACTOS
  useEffect(() => {
    const handleHistorialGlobal = (mensajes) => {
      if (
        !mensajes ||
        mensajes.length === 0 ||
        usuariosGlobales.length === 0 ||
        !myId
      )
        return;

      // DESCIFRAMOS LOS MENSAJES NADA MÁS LLEGAR
      const msgsDescifrados = mensajes.map((m) => ({
        ...m,
        text: decrypt(m.text),
      }));

      const msgOtro = msgsDescifrados.find(
        (m) => String(m.fromUserId) !== String(myId)
      );
      const idContacto = msgOtro ? msgOtro.fromUserId : mensajes[0].toUserId;

      const contacto = usuariosGlobales.find(
        (u) => String(u._id) === String(idContacto)
      );

      //console.log("Mensajes de " + contacto.username + ":", mensajes);

      if (contacto) {
        // aseguramos que aparezca
        setMisContactosIds((prev) => [...new Set([...prev, contacto._id])]);

        //logica conteo leídos
        const totalNoLeidos = mensajes.filter(
          (m) => String(m.toUserId) === String(myId) && m.visto === false
        ).length;

        setCountsNovedades((prev) => ({
          ...prev,
          [contacto._id]: totalNoLeidos,
        }));

        //logica del badge
        const tienePendientes = mensajes.some(
          (m) => String(m.fromUserId) !== String(myId) && m.visto === false
        );

        if (tienePendientes) {
          // Solo ponemos el badge si NO tenemos abierto ese chat ahora mismo
          if (!selectedUser || selectedUser._id !== contacto._id) {
            setNovedades((prev) => [...new Set([...prev, contacto._id])]);
          }
        } else {
          // Si todo está leído, limpiamos el badge por si acaso
          setNovedades((prev) => prev.filter((id) => id !== contacto._id));
        }
      }
    };

    socket.on("historial", handleHistorialGlobal);
    return () => socket.off("historial", handleHistorialGlobal);
  }, [usuariosGlobales, myId, selectedUser]);

  // 5. INVITACIÓN POR URL
  useEffect(() => {
    const inviteId = new URLSearchParams(window.location.search).get("invite");
    if (inviteId && usuariosGlobales.length > 0 && !selectedUser) {
      const inviter = usuariosGlobales.find((u) => u._id === inviteId);
      if (inviter) {
        setMisContactosIds((prev) => [...new Set([...prev, inviteId])]);
        setSelectedUser(inviter);
        window.history.replaceState({}, document.title, "/");
      }
    }
  }, [usuariosGlobales, selectedUser]);

  // 6. MENSAJES NUEVOS
  useEffect(() => {
    const handleMensajeNovedad = async (msg) => {
      const esMio = String(msg.fromUserId) === String(myId);

      if (!esMio) {
        const currentSelected = selectedUserRef.current;
        const currentIsNotifications = isNotificationsRef.current;
        const currentUsuarios = usuariosGlobalesRef.current;

        const esChatAbierto =
          currentSelected &&
          String(currentSelected._id) === String(msg.fromUserId);

        if (!esChatAbierto) {
          setCountsNovedades((prev) => ({
            ...prev,
            [msg.fromUserId]: (prev[msg.fromUserId] || 0) + 1,
          }));
          setNovedades((prev) => [...new Set([...prev, msg.fromUserId])]);

          if (Notification.permission === "granted" && currentIsNotifications) {
            const usuarioMsg = currentUsuarios.find(
              (u) => String(u._id) === String(msg.fromUserId)
            );

            const titulo = "Just Message";
            const body = usuarioMsg
              ? `Tienes un mensaje de ${usuarioMsg.username}`
              : "Tienes un mensaje";

            const avatarUsuario = usuarioMsg?.avatar || "/logo_chat_icon.png";
            // Generamos un tag único POR MENSAJE para que Windows/Android no los agrupe
            const uniqueTag = `msg-${msg._id || Date.now()}-${Math.random()}`;

            try {
              const registration = await navigator.serviceWorker.ready;
              await registration.showNotification(titulo, {
                body,
                icon: avatarUsuario,
                tag: uniqueTag,
                renotify: true,
                badge: "/logo_chat_icon.png",
                vibrate: [100, 50, 100],
                data: {
                  url: window.location.origin,
                  userName: usuarioMsg?.username,
                },
              });
            } catch (error) {
              // Fallback: Si el Service Worker no responde, usamos la API nativa
              const notif = new Notification(titulo, {
                body,
                icon: avatarUsuario,
                tag: uniqueTag,
                renotify: true,
              });
              notif.onclick = () => {
                window.focus();
                if (usuarioMsg) seleccionarChat(usuarioMsg);
              };
            }
          }
        }
      }
    };

    socket.on("mensaje", handleMensajeNovedad);
    return () => socket.off("mensaje", handleMensajeNovedad);
  }, [myId]);

  // 7. ESCUCHAR BORRADO PARA ACTUALIZAR CONTADORES
  useEffect(() => {
    const handleBorradoGlobal = ({ fromUserId, visto }) => {
      if (String(fromUserId) === String(myId)) return;
      if (visto === true) return;

      setCountsNovedades((prev) => {
        const actual = prev[fromUserId] || 0;
        const nuevoValor = actual > 0 ? actual - 1 : 0;

        if (nuevoValor === 0) {
          setNovedades((prevNov) =>
            prevNov.filter((id) => String(id) !== String(fromUserId))
          );
        }

        return {
          ...prev,
          [fromUserId]: nuevoValor,
        };
      });
    };

    socket.on("message-deleted", handleBorradoGlobal);

    return () => {
      socket.off("message-deleted", handleBorradoGlobal);
    };
  }, [myId]);

  // --- VISTAS ---
  if (!myId) {
    return (
      <UsernameForm
        onSubmit={(n, e, p) => {
          // Guardamos la clave ofuscada en session
          setPassword(p);
          sessionStorage.setItem("userP", btoa(p));
          socket.emit("join", { username: n, email: e, password: p });
        }}
        socket={socket}
      />
    );
  }

  if (selectedUser) {
    return (
      <Chat
        socket={socket}
        username={username}
        myId={myId}
        selectedUser={selectedUser}
        onBack={() => {
          setSelectedUser(null);
        }}
        onContactFound={(id) =>
          setMisContactosIds((prev) => [...new Set([...prev, id])])
        }
        decrypt={decrypt}
        encrypt={encrypt}
      />
    );
  }

  return (
    <ChatList
      usuarios={usuariosGlobales}
      miNombre={username}
      miId={myId}
      misContactosIds={misContactosIds}
      alSeleccionar={seleccionarChat}
      novedades={novedades}
      socket={socket}
      onLogout={handleLogout}
      countsNovedades={countsNovedades}
      isNotifications={isNotifications}
      onToggleNotifications={pedirPermisoNotificaciones}
    />
  );
}
