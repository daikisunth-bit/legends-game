import type { FastifyInstance } from "fastify";
import { Server } from "socket.io";
import type { ApiConfig } from "../config.js";

interface ClientToServerEvents {
  joinTown: (payload: { channel: string }) => void;
  move: (payload: { x: number; y: number; moving: boolean }) => void;
  chat: (payload: { text: string }) => void;
}
interface ServerToClientEvents {
  system: (payload: { message: string }) => void;
  playerMoved: (payload: { playerId: string; x: number; y: number; moving: boolean }) => void;
  chat: (payload: { playerId: string; text: string; timestamp: number }) => void;
}

export function attachSocketServer(app: FastifyInstance, config: ApiConfig): Server<ClientToServerEvents, ServerToClientEvents> {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(app.server, {
    cors: { origin: [...config.clientOrigins], credentials: true },
    transports: ["websocket", "polling"],
    pingInterval: 25_000,
    pingTimeout: 20_000
  });
  io.use(async (socket, next) => {
    try {
      const token = typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : "";
      const decoded = app.jwt.verify<{ sub: string }>(token);
      socket.data.accountId = decoded.sub;
      next();
    } catch { next(new Error("unauthorized")); }
  });
  io.on("connection", (socket) => {
    let room = "town:1";
    let lastMoveAt = 0;
    let lastChatAt = 0;
    void socket.join(room);
    socket.on("joinTown", ({ channel }) => {
      void socket.leave(room);
      room = `town:${channel.slice(0, 16)}`;
      void socket.join(room);
    });
    socket.on("move", ({ x, y, moving }) => {
      const now = Date.now();
      if (now - lastMoveAt < 900 || !Number.isFinite(x) || !Number.isFinite(y)) return;
      lastMoveAt = now;
      socket.to(room).emit("playerMoved", { playerId: socket.data.accountId as string, x, y, moving });
    });
    socket.on("chat", ({ text }) => {
      const now = Date.now();
      const normalized = text.trim().slice(0, 240);
      if (!normalized || now - lastChatAt < 2_000) return;
      lastChatAt = now;
      io.to(room).emit("chat", { playerId: socket.data.accountId as string, text: normalized, timestamp: now });
    });
  });
  return io;
}
