import { io, type Socket } from "socket.io-client";
import { auth } from "./firebase";

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket | null> {
  const user = auth.currentUser;
  if (!user) return null;
  if (socket) return socket;
  const token = await user.getIdToken();
  socket = io(import.meta.env.VITE_API_URL ?? "http://localhost:4000", { auth: { token } });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
