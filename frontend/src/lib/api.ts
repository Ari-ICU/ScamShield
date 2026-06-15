/**
 * Centralised API config for the ScamShield frontend.
 *
 * In development the NEXT_PUBLIC_API_URL env var defaults to
 * http://localhost:4000/api, keeping the same localhost behaviour as before.
 *
 * In production set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_SOCKET_URL to your
 * deployed backend URLs.
 */

let apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
  apiBase = apiBase.replace("localhost", window.location.hostname).replace("127.0.0.1", window.location.hostname);
  socketUrl = socketUrl.replace("localhost", window.location.hostname).replace("127.0.0.1", window.location.hostname);
}

export { apiBase as API_BASE, socketUrl as SOCKET_URL };
