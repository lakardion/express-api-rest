import http from 'http';
import { Server } from 'socket.io';

let io: Server;
export const socket = {
  init: (httpServer: http.Server) => {
    io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.IO not initialized');
    }
    return io;
  },
};
