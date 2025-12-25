import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import UsernameForm from "./components/UsernameForm/UsernameForm";
import ChatList from "./components/chatList/ChatList";
import Chat from "./components/chat/Chat";

const socket = io("https://chatback-ily9.onrender.com");

export default function App() {
  const [username, setUsername] = useState(sessionStorage.getItem("username") || "");
  const [usuariosGlobales, setUsuariosGlobales] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [myId, setMyId] = useState("");
  const [misContactosIds, setMisContactosIds] = useState([]);

  useEffect(() => {
    if (!username) return;
    socket.emit("join", { username });

    socket.on("init-session", (data) => {
      setMyId(data.userId);
    });

    socket.on("lista-usuarios-global", (users) => {
      setUsuariosGlobales(users);
    });

    return () => { socket.off(); };
  }, [username]);

  useEffect(() => {
    const handleHistorialGlobal = (mensajes) => {
      if (!mensajes || mensajes.length === 0 || usuariosGlobales.length === 0) return;

      const otroMensaje = mensajes.find(m => m.user !== username);
      if (otroMensaje) {
        const contacto = usuariosGlobales.find(u => u.username === otroMensaje.user);
        if (contacto) {
          setMisContactosIds(prev => [...new Set([...prev, contacto._id])]);
        }
      }
    };

    socket.on("historial", handleHistorialGlobal);
    return () => { socket.off("historial", handleHistorialGlobal); };
  }, [usuariosGlobales, username]);

  useEffect(() => {
    const inviteId = new URLSearchParams(window.location.search).get("invite");
    if (inviteId && usuariosGlobales.length > 0 && !selectedUser) {
      const inviter = usuariosGlobales.find(u => u._id === inviteId);
      if (inviter) {
        setMisContactosIds(prev => [...new Set([...prev, inviteId])]);
        setSelectedUser(inviter);
        window.history.replaceState({}, document.title, "/");
      }
    }
  }, [usuariosGlobales, selectedUser]);

  if (!username) return <UsernameForm onSubmit={(n) => { sessionStorage.setItem("username", n); setUsername(n); }} />;

  if (selectedUser) {
    return (
      <Chat 
        socket={socket} 
        username={username} 
        selectedUser={selectedUser} 
        onBack={() => setSelectedUser(null)} 
        onContactFound={(id) => setMisContactosIds(prev => [...new Set([...prev, id])])}
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