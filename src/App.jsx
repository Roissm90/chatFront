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
  const [myId, setMyId] = useState(""); // Esta es la clave
  const [misContactosIds, setMisContactosIds] = useState([]);

  // 1. ESCUCHAR EVENTOS DEL SERVIDOR
  useEffect(() => {
    socket.on("init-session", (data) => {
      setMyId(data.userId);
    });

    socket.on("user-error", (mensaje) => {
      console.log("⚠️ ERROR DEL SERVIDOR:", mensaje);
      sessionStorage.clear();
      setUsername("");
      setEmail("");
      setMyId(""); 
      //alert(mensaje);
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

  // 2. COMANDO COMAND + E
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

  // 3. LOGICA DE CONEXIÓN
  useEffect(() => {
    if (username && email) {
      socket.emit("join", { username, email });
    }
  }, [username, email]);

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

  // 5. INVITACIÓN
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

  if (!username || !email || !myId) {
    return (
      <UsernameForm
        onSubmit={(n, e) => {
          setUsername(n);
          setEmail(e);
          sessionStorage.setItem("username", n);
          sessionStorage.setItem("userEmail", e);
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