// Server-side configuration read from the Node.js process environment.
// Replaces the Cloudflare Workers `env` binding so the app runs in a
// standard Node container (Azure Container Apps). Never import from client code.
export const env = process.env as Record<string, string | undefined>;
