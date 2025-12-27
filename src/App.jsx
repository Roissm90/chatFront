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

  const [password, setPassword] = useState(() => {
    const saved = sessionStorage.getItem("userP");
    return saved ? atob(saved) : "";
  });

  const [usuariosGlobales, setUsuariosGlobales] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [myId, setMyId] = useState("");
  const [misContactosIds, setMisContactosIds] = useState([]);
  const [novedades, setNovedades] = useState([]);

  const [ultimasLecturas, setUltimasLecturas] = useState({});

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

      const mensajeAjeno = mensajes.find((m) => m.user !== username);
      // Usamos una comparación segura de strings
      const contacto = usuariosGlobales.find(
        (u) =>
          u.username ===
          (mensajeAjeno
            ? mensajeAjeno.user
            : mensajes[0].user === username
            ? ""
            : mensajes[0].user)
      );

      if (contacto) {
        setMisContactosIds((prev) => [...new Set([...prev, contacto._id])]);

        const ultimoMsg = mensajes[mensajes.length - 1];
        if (ultimoMsg.user !== username) {
          const fechaMsg = new Date(ultimoMsg.timestamp).getTime();
          const fechaLectura = ultimasLecturas[contacto._id] || 0;

          if (
            fechaMsg > fechaLectura &&
            (!selectedUser || selectedUser._id !== contacto._id)
          ) {
            setNovedades((prev) => [...new Set([...prev, contacto._id])]);
          }
        }
      }
    };

    socket.on("historial", handleHistorialGlobal);
    return () => socket.off("historial", handleHistorialGlobal);
    // IMPORTANTE: selectedUser debe ir completo, pero nunca condicionalmente
  }, [usuariosGlobales, username, selectedUser, ultimasLecturas]);

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
          setMisContactosIds((prev) => [...new Set([...prev, emisor._id])]);
          setNovedades((prev) => [...new Set([...prev, emisor._id])]);
        }
      }
    };

    socket.on("mensaje", handleMensajeNovedad);
    return () => socket.off("mensaje", handleMensajeNovedad);
  }, [username, selectedUser, usuariosGlobales]);

  const seleccionarChat = (user) => {
    setNovedades((prev) => prev.filter((id) => id !== user._id));
    setUltimasLecturas((prev) => ({
      ...prev,
      [user._id]: Date.now(),
    }));
    setSelectedUser(user);
  };

  const handleLogout = () => {
    sessionStorage.clear();
    setUsername("");
    setEmail("");
    setPassword("");
    setMyId("");
    setSelectedUser(null);
    socket.disconnect();
    socket.connect();
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
        onBack={() => {
          setUltimasLecturas((prev) => ({
            ...prev,
            [selectedUser._id]: Date.now(),
          }));
          setSelectedUser(null);
        }}
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
