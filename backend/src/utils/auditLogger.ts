import prisma from "../prisma/prismaClient.js";
import logger from "./logger.js";

export async function logAdminAction(
  adminId: string,
  action: string,
  entity: string,
  entityId: string,
  details?: any
) {
  try {
    const detailsString = details ? JSON.stringify(details) : null;
    await prisma.auditLog.create({
      data: {
        adminId,
        action,
        entity,
        entityId,
        details: detailsString,
      },
    });
    logger.info(`Audit Log: Admin ${adminId} performed ${action} on ${entity} ${entityId}`);
  } catch (err: any) {
    logger.error(`Failed to create audit log: ${err.message}`);
  }
}
