import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";

let io: Server | null = null;

export function createSocketServer(httpServer: HttpServer) {
  io = new Server(httpServer, { cors: { origin: env.CLIENT_URL } });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    const verified = await getVerifiedUid(token ? `Bearer ${token}` : undefined);
    if (!verified) return next(new Error("unauthorized"));
    const user = await prisma.user.findUnique({ where: { firebaseUid: verified.uid } });
    if (!user) return next(new Error("unauthorized"));
    socket.data.userId = user.id;
    next();
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.on("disconnect", () => {});
  });

  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(`user:${userId}`).emit(event, payload);
}
