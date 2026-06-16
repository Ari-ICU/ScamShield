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

if (typeof window !== "undefined") {
  const host = window.location.hostname;
  const port = window.location.port;

  // If the browser accesses the app directly on Next.js port 3000 (bypassing Nginx proxy),
  // dynamically route API/Socket queries directly to backend container's host port 4000
  if (port === "3000") {
    apiBase = `http://${host}:4000/api`;
    socketUrl = `http://${host}:4000`;
  } else if (port === "" || port === "80" || port === "443") {
    // If accessing via the Nginx proxy (standard entrypoint), keep it relative
    apiBase = "/api";
    socketUrl = "/";
  } else {
    // Custom domain mapping fallback
    apiBase = apiBase.replace("localhost", host).replace("127.0.0.1", host);
    socketUrl = socketUrl.replace("localhost", host).replace("127.0.0.1", host);
  }
}

export { apiBase as API_BASE, socketUrl as SOCKET_URL };
