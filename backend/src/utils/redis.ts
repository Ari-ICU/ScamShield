import { createClient, RedisClientType } from "redis";
import logger from "./logger.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
let redisClient: RedisClientType | null = null;
let isConnected = false;

if (process.env.NODE_ENV !== "test") {
  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            // Stop retrying to connect after 5 times to avoid flooding logs
            logger.warn("Redis connection failed. Falling back to direct database routing.");
            isConnected = false;
            return false;
          }
          return Math.min(retries * 500, 2000);
        }
      }
    }) as RedisClientType;

    redisClient.on("error", (err) => {
      logger.error(`Redis Error: ${err.message || err}`);
      isConnected = false;
    });

    redisClient.on("connect", () => {
      logger.info("Connecting to Redis...");
    });

    redisClient.on("ready", () => {
      logger.info("🚀 Redis cache service is ready.");
      isConnected = true;
    });

    // Fire-and-forget connection
    redisClient.connect().catch((err) => {
      logger.warn(`Failed to connect to Redis initially: ${err.message}. Cache bypass active.`);
      isConnected = false;
    });
  } catch (err: any) {
    logger.error(`Failed to initialize Redis client: ${err.message}`);
    isConnected = false;
  }
}

/**
 * Checks if Redis client is ready.
 */
export function isCacheAvailable(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Gets a value from cache.
 */
export async function getCache(key: string): Promise<string | null> {
  if (!isCacheAvailable() || !redisClient) return null;
  try {
    return await redisClient.get(key);
  } catch (err: any) {
    logger.warn(`Redis getCache failed for key ${key}: ${err.message}`);
    return null;
  }
}

/**
 * Sets a value in cache with optional TTL in seconds (default 300).
 */
export async function setCache(key: string, value: string, ttlSeconds = 300): Promise<void> {
  if (!isCacheAvailable() || !redisClient) return;
  try {
    await redisClient.set(key, value, {
      EX: ttlSeconds,
    });
  } catch (err: any) {
    logger.warn(`Redis setCache failed for key ${key}: ${err.message}`);
  }
}

/**
 * Deletes a key from cache.
 */
export async function delCache(key: string): Promise<void> {
  if (!isCacheAvailable() || !redisClient) return;
  try {
    await redisClient.del(key);
  } catch (err: any) {
    logger.warn(`Redis delCache failed for key ${key}: ${err.message}`);
  }
}

/**
 * Helper to get raw client if needed (e.g. for BullMQ)
 */
export function getRedisClient(): RedisClientType | null {
  return redisClient;
}

export default redisClient;
