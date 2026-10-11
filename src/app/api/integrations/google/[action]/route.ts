import { beginConnection, calendarEvents, connection, disconnect, finishConnection, googleConfigured, redirectUri } from "@/lib/personal/google-calendar";
import { sameOrigin } from "@/lib/personal/schema";

type Context = { params: Promise<{ action: string }> };
const validId = (id: unknown): id is string => typeof id === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(id);

export async function GET(request: Request, context: Context) {
  const { action } = await context.params;
  const url = new URL(request.url);
  if (action === "callback") {
    const target = new URL("/my-work", new URL(redirectUri()).origin);
    try {
      target.searchParams.set("employee", await finishConnection(url));
      target.searchParams.set("calendar", "connected");
    } catch { target.searchParams.set("calendar", "failed"); }
    return Response.redirect(target, 303);
  }
  const interviewId = url.searchParams.get("employee");
  if (!validId(interviewId)) return Response.json({ error: "Select an employee first." }, { status: 400 });
  if (action === "status") return Response.json({ configured: googleConfigured(), connected: Boolean(await connection(interviewId)), aiConfigured: Boolean(process.env.OPENAI_API_KEY), redirectUri: redirectUri() }, { headers: { "Cache-Control": "no-store" } });
  if (action === "events") {
    try { return Response.json({ events: await calendarEvents(interviewId) }, { headers: { "Cache-Control": "no-store" } }); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Calendar unavailable." }, { status: 502 }); }
  }
  return Response.json({ error: "Not found." }, { status: 404 });
}

export async function POST(request: Request, context: Context) {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { action } = await context.params;
  if (action === "disconnect") { await disconnect(); return Response.json({ connected: false }); }
  if (action !== "connect") return Response.json({ error: "Not found." }, { status: 404 });
  const input = await request.json().catch(() => null);
  if (!validId(input?.interviewId)) return Response.json({ error: "Select an employee first." }, { status: 400 });
  try { return Response.json({ url: await beginConnection(input.interviewId, new URL(request.url).origin) }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Calendar unavailable." }, { status: 400 }); }
}
