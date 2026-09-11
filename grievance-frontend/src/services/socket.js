import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    const serverUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
    socket = io(serverUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("🔌 Connected to real-time socket server:", socket.id);
      const userId = localStorage.getItem("grievance_id");
      if (userId) {
        socket.emit("join_user", userId.toUpperCase());
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 Socket disconnected:", reason);
    });

    socket.on("connect_error", (error) => {
      console.warn("Socket connection warning:", error.message);
    });
  }

  return socket;
};

export const connectSocketUser = (userId) => {
  const s = getSocket();
  if (s && userId) {
    if (s.connected) {
      s.emit("join_user", userId.toUpperCase());
    } else {
      s.once("connect", () => {
        s.emit("join_user", userId.toUpperCase());
      });
    }
    
  }
  return s;
};

export const joinChatRoom = (grievanceId) => {
  const s = getSocket();
  if (s && grievanceId) {
    s.emit("join_chat", grievanceId);
  }
};

export const leaveChatRoom = (grievanceId) => {
  const s = getSocket();
  if (s && grievanceId) {
    s.emit("leave_chat", grievanceId);
  }
};
