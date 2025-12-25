import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import UsernameForm from "./components/usernameForm/UsernameForm";
import ChatList from "./components/chatList/ChatList";
import Chat from "./components/chat/Chat";

const socket = io("https://chatback-ily9.onrender.com");

export default function App() {
  const [username, setUsername] = useState(sessionStorage.getItem("username") || "");
  const [email, setEmail] = useState(sessionStorage.getItem("userEmail") || "");
  const [usuariosGlobales, setUsuariosGlobales] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [myId, setMyId] = useState(""); 
  const [misContactosIds, setMisContactosIds] = useState([]);

  // 1. ESCUCHAR EVENTOS DEL SERVIDOR
  useEffect(() => {
    socket.on("init-session", (data) => {
      // SOLO CUANDO EL SERVIDOR RESPONDE OK:
      // Seteamos los estados y guardamos en sessionStorage
      setMyId(data.userId);
      
      // Si venimos del formulario (no de una recarga), guardamos los datos
      if (data.tempName && data.tempEmail) {
        setUsername(data.tempName);
        setEmail(data.tempEmail);
        sessionStorage.setItem("username", data.tempName);
        sessionStorage.setItem("userEmail", data.tempEmail);
      }
    });

    socket.on("user-error", (mensaje) => {
      console.log("⚠️ ERROR DEL SERVIDOR:", mensaje);
      // No hacemos NADA. El formulario ya escucha este error para mostrar el banner.
      // Al no hacer nada aquí, username y email en App siguen vacíos y no se guarda nada.
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
        setMyId("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 3. LOGICA DE RECONEXIÓN AUTOMÁTICA
  useEffect(() => {
    // Si ya existen datos en el navegador (login previo), conectamos
    if (username && email && !myId) {
      socket.emit("join", { username, email, password: "" });
    }
  }, [username, email, myId]);

  // 4. HISTORIAL Y CONTACTOS
  useEffect(() => {
    const handleHistorialGlobal = (mensajes) => {
      if (!mensajes || mensajes.length === 0 || usuariosGlobales.length === 0) return;
      const otroMensaje = mensajes.find((m) => m.user !== username);
      if (otroMensaje) {
        const contacto = usuariosGlobales.find((u) => u.username === otroMensaje.user);
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

  // --- VISTAS ---
  if (!myId) {
    return (
      <UsernameForm
        onSubmit={(n, e, p) => {
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
        onContactFound={(id) => setMisContactosIds((prev) => [...new Set([...prev, id])])}
      />
    );
  }

  return (
    <ChatList
      usuarios={usuariosGlobales}
      miNombre={username}
      miId={myId}
      misContactosIds={misContactosIds}
      alSeleccionar={setSelectedUser}
      socket={socket}
    />
  );
}