import "server-only";
import { cookies } from "next/headers";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { config, db, DiscoveryError, hash, issueAccess, resolveAccess, setConfig } from "./database";
import type { Access } from "./schema";
import { ZodError } from "zod";

const COOKIE = "fieldwork_research";
export const ownerConfigured = () => Boolean(process.env.FIELDWORK_ADMIN_PASSWORD || config<string>("ownerPassword"));
export function localSetupAllowed(request: Request) {
  const url = new URL(request.url);
  return process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}
export function setupOwner(password: string, request: Request) {
  if (ownerConfigured() || !localSetupAllowed(request)) throw new DiscoveryError("Owner setup is available only on the local development server before an owner exists.", 403);
  if (password.length < 12 || password.length > 200) throw new DiscoveryError("Use a password between 12 and 200 characters.");
  const salt = randomBytes(16).toString("hex");
  setConfig("ownerPassword", `${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
}
export function verifyOwner(password: string) {
  if (password.length > 200) return false;
  if (process.env.FIELDWORK_ADMIN_PASSWORD && process.env.FIELDWORK_ADMIN_PASSWORD.length < 12) throw new DiscoveryError("The server’s owner password must contain at least 12 characters.", 503);
  if (process.env.FIELDWORK_ADMIN_PASSWORD) return timingSafeEqual(Buffer.from(hash(password)), Buffer.from(hash(process.env.FIELDWORK_ADMIN_PASSWORD)));
  const saved = config<string>("ownerPassword");
  if (!saved) return false;
  const [salt, digest] = saved.split(":");
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(digest, "hex"));
}
export async function access() { return resolveAccess((await cookies()).get(COOKIE)?.value ?? ""); }
export async function requireAccess(ownerOnly = false) {
  const who = await access();
  if (!who) throw new DiscoveryError("Sign in to the research workspace.", 401);
  if (ownerOnly && who.role !== "owner") throw new DiscoveryError("Only the research owner can do that.", 403);
  return who;
}
export async function signIn(who: Access, request: Request) {
  const token = issueAccess(who);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "strict", secure: new URL(request.url).protocol === "https:", path: "/", maxAge: 86400 });
}
export async function signOut() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM access WHERE token_hash=?").run(hash(token));
  jar.delete(COOKIE);
}
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new DiscoveryError("Invalid request origin.", 403);
}
export async function readBody(request: Request, max = 16000) {
  if (Number(request.headers.get("content-length") || 0) > max) throw new DiscoveryError("Request too large.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new DiscoveryError("A request body is required.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > max) { await reader.cancel(); throw new DiscoveryError("Request too large.", 413); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new DiscoveryError("Invalid JSON."); }
}
export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" } });
}
export function failure(error: unknown) {
  if (error instanceof ZodError) return json({ error: "Please check the required fields." }, 400);
  if (error instanceof DiscoveryError) return json({ error: error.message }, error.status);
  return json({ error: "This request could not be completed. Your saved interview has not been lost. Try again." }, 500);
}

/** Existing demo AI endpoints must not become anonymous paid APIs when deployed. */
export async function protectLegacyApi(request: Request) {
  if (process.env.NODE_ENV !== "production") return null;
  try { checkOrigin(request); await requireAccess(); return null; } catch (error) { return failure(error); }
}
