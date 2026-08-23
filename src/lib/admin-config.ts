// Server-only admin configuration.
// NEVER import this module from client components ("use client") —
// it must stay out of the client bundle.
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "eurodrigocaetano@gmail.com";
