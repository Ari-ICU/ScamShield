import { Response } from "express";
import prisma from "../prisma/prismaClient.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import logger from "../utils/logger.js";

/**
 * Retrieves all notifications for the authenticated user.
 */
export async function getNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50, // Limit to recent 50
    });

    return res.json(notifications);
  } catch (err: any) {
    logger.error(`Error loading notifications for User ${userId}: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Marks a single notification as read.
 */
export async function markAsRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return res.json(updated);
  } catch (err: any) {
    logger.error(`Error marking notification as read: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Marks all notifications as read for the authenticated user.
 */
export async function markAllAsRead(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return res.json({ message: "All notifications marked as read", count: result.count });
  } catch (err: any) {
    logger.error(`Error marking all notifications as read: ${err.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
}
