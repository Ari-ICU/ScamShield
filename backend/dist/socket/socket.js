import { Server as SocketServer } from "socket.io";
import logger from "../utils/logger.js";
let io = null;
export function initSocket(server) {
    io = new SocketServer(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin)
                    return callback(null, true);
                const isDev = process.env.NODE_ENV !== "production";
                if (isDev) {
                    const isLocal = /^(https?:\/\/)?(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
                    if (isLocal) {
                        return callback(null, true);
                    }
                }
                const allowedOrigin = process.env.FRONTEND_URL || "http://localhost:3000";
                if (origin === allowedOrigin) {
                    return callback(null, true);
                }
                return callback(null, false);
            },
            methods: ["GET", "POST"],
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        logger.info(`Socket connected: ${socket.id}`);
        socket.on("disconnect", () => {
            logger.info(`Socket disconnected: ${socket.id}`);
        });
    });
    return io;
}
export function getIO() {
    if (!io) {
        throw new Error("Socket.io is not initialized!");
    }
    return io;
}
export function broadcastNewReport(reportData) {
    if (io) {
        io.emit("new_report", reportData);
        logger.debug(`Broadcasted new report: ${JSON.stringify(reportData)}`);
    }
}
export function broadcastRiskAlert(alertData) {
    if (io) {
        io.emit("risk_alert", alertData);
        logger.warn(`Broadcasted risk alert: ${JSON.stringify(alertData)}`);
    }
}
export function broadcastIncomingCall(callData) {
    if (io) {
        io.emit("incoming_call", callData);
        logger.info(`Broadcasted incoming call: ${JSON.stringify(callData)}`);
    }
}
export function broadcastAnswerCall(callData) {
    if (io) {
        io.emit("answer_call", callData);
        logger.info(`Broadcasted answer call: ${JSON.stringify(callData)}`);
    }
}
export function broadcastHangupCall() {
    if (io) {
        io.emit("hangup_call");
        logger.info(`Broadcasted hangup call`);
    }
}
