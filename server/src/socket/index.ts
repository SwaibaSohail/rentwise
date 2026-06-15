import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env";

export function createSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CLIENT_URL },
  });

  io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("socket disconnected:", socket.id);
    });
  });

  return io;
}
