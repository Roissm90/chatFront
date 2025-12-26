import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import UsernameForm from "./components/usernameForm/UsernameForm";
import ChatList from "./components/chatList/ChatList";
import Chat from "./components/chat/Chat";

const socket = io("https://chatback-ily9.onrender.com");

export default function App() {
  const [username, setUsername] = useState(
    sessionStorage.getItem("username") || ""
  );
  const [email, setEmail] = useState(sessionStorage.getItem("userEmail") || "");

  // Recuperamos la clave ofuscada si existe
  const [password, setPassword] = useState(() => {
    const saved = sessionStorage.getItem("userP");
    return saved ? atob(saved) : "";
  });

  const [usuariosGlobales, setUsuariosGlobales] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [myId, setMyId] = useState("");
  const [misContactosIds, setMisContactosIds] = useState([]);
  const [novedades, setNovedades] = useState([]);

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
      console.log("⚠️ ERROR DEL SERVIDOR:", mensaje);
      // Si los datos guardados fallan, limpiamos para evitar bucles
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
      if (!mensajes || mensajes.length === 0 || usuariosGlobales.length === 0)
        return;
      const otroMensaje = mensajes.find((m) => m.user !== username);
      if (otroMensaje) {
        const contacto = usuariosGlobales.find(
          (u) => u.username === otroMensaje.user
        );
        if (contacto) {
          setMisContactosIds((prev) => [...new Set([...prev, contacto._id])]);
        }
      }
    };
    socket.on("historial", handleHistorialGlobal);
    return () => socket.off("historial", handleHistorialGlobal);
  }, [usuariosGlobales, username]);

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
    const handleMensajeNovedad = (msg) => {
      if (
        msg.user !== username &&
        (!selectedUser || selectedUser.username !== msg.user)
      ) {
        const emisor = usuariosGlobales.find((u) => u.username === msg.user);
        if (emisor) {
          setNovedades((prev) => [...new Set([...prev, emisor._id])]);
        }
      }
    };

    socket.on("mensaje", handleMensajeNovedad);
    return () => socket.off("mensaje", handleMensajeNovedad);
  }, [username, selectedUser, usuariosGlobales]);

  const seleccionarChat = (user) => {
    setNovedades((prev) => prev.filter((id) => id !== user._id));
    setSelectedUser(user);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setUsername("");
    setEmail("");
    setPassword("");
    setMyId("");
    setSelectedUser(null);
    // Opcional: desconectar socket manualmente si fuera necesario
    // socket.disconnect();
    // socket.connect();
  };

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
        selectedUser={selectedUser}
        onBack={() => setSelectedUser(null)}
        onContactFound={(id) =>
          setMisContactosIds((prev) => [...new Set([...prev, id])])
        }
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
    />
  );
}
