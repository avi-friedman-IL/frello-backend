import { logger } from "./logger.service.js";
import { Server } from "socket.io";

var gIo = null;

export function setupSocketAPI(http) {
  gIo = new Server(http, {
    cors: {
      origin: "*",
    },
  });

  // Handling new socket connections
  gIo.on("connection", (socket) => {
    logger.info(`New connected socket [id: ${socket.id}]`);

    // Handle socket disconnect
    socket.on("disconnect", () => {
      console.log(`Socket disconnected [id: ${socket.id}]`);
    });

    // Join a specific board (room)
    socket.on("joinBoard", ({ boardId, currUser }) => {
      socket.join(boardId);
      socket.myBoard = boardId;
      socket.userId = currUser._id;
      socket.fullname = currUser.fullname;
      console.log(`Socket ${socket.id}joined board ${boardId}`);
    });

    // Leave the board (room)
    socket.on("leaveBoard", (boardId) => {
      socket.leave(boardId);
      console.log(`Socket ${socket.id} left board ${boardId}`);
      broadcast({
        type: "userLeft",
        data: { id: socket.id },
        room: boardId,
        userId: socket.id,
      });
    });

    // Handle mouse movement event
    socket.on("mouseMove", (mouseData) => {
      const { boardId, x, y } = mouseData;
      const cursorData = { id: socket.id, fullname: socket.fullname, x, y };

      broadcast({
        type: "mouseMove",
        data: cursorData,
        userId: socket.id,
        room: boardId,
      });
    });

    // Set user ID for the socket
    socket.on("set-user-socket", (userId) => {
      console.log(
        `Setting socket.userId = ${userId} for socket [id: ${socket.id}]`
      );
      socket.userId = userId;
    });

    // Get all connected users
    socket.on("get-connected-users", async () => {
      const connectedUsers = await _getAllSockets();
      const userIds = connectedUsers.map((s) => s.userId || null);
      socket.emit("connected-users", userIds);
    });

    // Chat functionalities
    socket.on("chat-set-topic", (topic) => {
      if (socket.myTopic === topic) return;
      if (socket.myTopic) {
        socket.leave(socket.myTopic);
        logger.info(
          `Socket is leaving topic ${socket.myTopic} [id: ${socket.id}]`
        );
      }
      socket.join(topic);
      socket.myTopic = topic;
    });

    socket.on("chat-send-msg", (msg) => {
      logger.info(
        `New chat msg from socket [id: ${socket.id}], emitting to topic ${socket.myTopic}`
      );
      gIo.to(socket.myTopic).emit("chat-add-msg", msg);
    });

    // Watch user events
    socket.on("user-watch", (userId) => {
      logger.info(
        `user-watch from socket [id: ${socket.id}], on user ${userId}`
      );
      socket.join("watching:" + userId);
    });

    // Unset user ID from the socket
    socket.on("unset-user-socket", () => {
      logger.info(`Removing socket.userId for socket [id: ${socket.id}]`);
      delete socket.userId;
    });
  });
}

// Emit an event to all users or users watching a specific label
function emitTo({ type, data, label }) {
  if (label) gIo.to("watching:" + label.toString()).emit(type, data);
  else gIo.emit(type, data);
}

// Emit an event to a specific user
async function emitToUser({ type, data, userId }) {
  userId = userId.toString();
  const socket = await _getUserSocket(userId);
  if (socket) {
    logger.info(
      `Emitting event: ${type} to user: ${userId} socket [id: ${socket.id}]`
    );
    socket.emit(type, data);
  } else {
    logger.info(`No active socket for user: ${userId}`);
  }
}

// Broadcast an event to a room or all users, excluding a specific user if needed
async function broadcast({ type, data, room = null, userId }) {
  userId = userId.toString();
  logger.info(`Broadcasting event: ${type}`);
  const excludedSocket = await _getUserSocket(userId);

  if (room && excludedSocket) {
    logger.info(`Broadcast to room ${room} excluding user: ${userId}`);
    excludedSocket.broadcast.to(room).emit(type, data);
  } else if (excludedSocket) {
    logger.info(`Broadcast to all excluding user: ${userId}`);
    excludedSocket.broadcast.emit(type, data);
  } else if (room) {
    logger.info(`Emit to room: ${room}`);
    gIo.to(room).emit(type, data);
  } else {
    logger.info(`Emit to all`);
    gIo.emit(type, data);
  }
}

// Helper functions

// Get the socket of a specific user
async function _getUserSocket(userId) {
  const sockets = await _getAllSockets();
  return sockets.find((s) => s.userId === userId);
}

// Get all active sockets
async function _getAllSockets() {
  return await gIo.fetchSockets();
}

// Print details of all active sockets
async function _printSockets() {
  const sockets = await _getAllSockets();
  console.log(`Sockets: (count: ${sockets.length}):`);
  sockets.forEach(_printSocket);
}

// Print the details of a specific socket
function _printSocket(socket) {
  console.log(`Socket - socketId: ${socket.id} userId: ${socket.userId}`);
}

export const socketService = {
  setupSocketAPI,
  emitTo,
  emitToUser,
  broadcast,
};

// import { logger } from "./logger.service.js";
// import { Server } from "socket.io";
// var gIo = null;
// export function setupSocketAPI(http) {
//   gIo = new Server(http, {
//     cors: {
//       origin: "*",
//     },
//   });

//   gIo.on("connection", (socket) => {
//    logger.info(`New connected socket [id: ${socket.id}]`);

//     socket.on("disconnect", () => {
//       console.log(`Socket disconnected [id: ${socket.id}]`);

//       // gIo.to(socket.myBoard).emit("userLeft", { id: socket.id });
//       console.log(`User left event emitted to board ${socket.myBoard} with socket id ${socket.id}`);
//     });

//     socket.on("joinBoard", (boardId) => {
//       socket.join(boardId);
//       socket.myBoard = boardId;
//       console.log(`Socket ${socket.id} joined board ${boardId}`);
//     });

//     socket.on("leaveBoard", (boardId) => {
//       socket.leave(boardId);
//       console.log(`Socket ${socket.id} left board ${boardId}`);

//       broadcast({ type: "userLeft", data: { id: socket.id }, room: boardId, userId: socket.id });
//     });

//     socket.on("mouseMove", (mouseData) => {
//       const { boardId, x, y } = mouseData;
//       const cursorData = { id: socket.id, x, y };

//       broadcast({
//         type: "mouseMove",
//         data: cursorData,
//         userId: socket.id,
//         room: boardId,
//       });
//     });

//     socket.on("set-user-socket", (userId) => {
//       console.log(
//         `Setting socket.userId = ${userId} for socket [id: ${socket.id}]`
//       );
//       socket.userId = userId;
//     });

//     socket.on("get-connected-users", async () => {
//       const connectedUsers = await _getAllSockets();
//       const userIds = connectedUsers.map((s) => s.userId || null);
//       socket.emit("connected-users", userIds);
//     });

//     socket.on("chat-set-topic", (topic) => {
//       if (socket.myTopic === topic) return;
//       if (socket.myTopic) {
//         socket.leave(socket.myTopic);
//         logger.info(
//           `Socket is leaving topic ${socket.myTopic} [id: ${socket.id}]`
//         );
//       }
//       socket.join(topic);
//       socket.myTopic = topic;
//     });
//     socket.on("chat-send-msg", (msg) => {
//       logger.info(
//         `New chat msg from socket [id: ${socket.id}], emitting to topic ${socket.myTopic}`
//       );
//       gIo.to(socket.myTopic).emit("chat-add-msg", msg);

//     });
//     socket.on("user-watch", (userId) => {
//       logger.info(
//         `user-watch from socket [id: ${socket.id}], on user ${userId}`
//       );

//       socket.join("watching:" + userId);
//     });

//     socket.on("unset-user-socket", () => {
//       logger.info(`Removing socket.userId for socket [id: ${socket.id}]`);
//       delete socket.userId;
//     });
//   });
// }
// function emitTo({ type, data, label }) {
//   if (label) gIo.to("watching:" + label.toString()).emit(type, data);
//   else gIo.emit(type, data);
// }
// async function emitToUser({ type, data, userId }) {
//   userId = userId.toString();
//   const socket = await _getUserSocket(userId);
//   if (socket) {
//     logger.info(
//       `Emitting event: ${type} to user: ${userId} socket [id: ${socket.id}]`
//     );
//     socket.emit(type, data);
//   } else {
//     logger.info(`No active socket for user: ${userId}`);
//   }
// }
// async function broadcast({ type, data, room = null, userId }) {
//   userId = userId.toString();
//   console.log('userId',userId)
//   logger.info(`Broadcasting event: ${type}`);
//   const excludedSocket = await _getUserSocket(userId);
//   if (room && excludedSocket) {
//     logger.info(`Broadcast to room ${room} excluding user: ${userId}`);
//     excludedSocket.broadcast.to(room).emit(type, data);
//   } else if (excludedSocket) {
//     logger.info(`Broadcast to all excluding user: ${userId}`);
//     excludedSocket.broadcast.emit(type, data);
//   } else if (room) {
//     logger.info(`Emit to room: ${room}`);
//     gIo.to(room).emit(type, data);
//   } else {
//     logger.info(`Emit to all`);
//     gIo.emit(type, data);
//   }
// }
// async function _getUserSocket(userId) {
//   const sockets = await _getAllSockets();
//   return sockets.find((s) => s.userId === userId);
// }
// async function _getAllSockets() {
//   return await gIo.fetchSockets();
// }
// async function _printSockets() {
//   const sockets = await _getAllSockets();
//   console.log(`Sockets: (count: ${sockets.length}):`);
//   sockets.forEach(_printSocket);
// }
// function _printSocket(socket) {
//   console.log(`Socket - socketId: ${socket.id} userId: ${socket.userId}`);
// }
// export const socketService = {
//   setupSocketAPI,
//   emitTo,
//   emitToUser,
//   broadcast,
// };
