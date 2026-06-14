import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocketClient = (): Socket => {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("mcips_token") : null;
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000", {
      autoConnect: false,
      transports: ["websocket", "polling"],
      auth: { token },
      withCredentials: true
    });
  } else {
    socket.auth = { token };
  }

  return socket;
};
