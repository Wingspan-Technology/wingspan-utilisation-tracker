import { NextRequest } from "next/server";
import { verifySlackRequest, resolveAppUser, getMissedWeekdays, buildMissedDaysBlocks } from "@/lib/slack";

async function buildMissedDaysResponse(slackUserId: string) {
  const user = await resolveAppUser(slackUserId);
  if (!user) {
    return {
      response_type: "ephemeral",
      text: "I couldn't match your Slack account to a Wingspan Utilisation Tracker user. Ask an admin to check your account email.",
    };
  }

  const missedDays = await getMissedWeekdays(user.id);
  return { response_type: "ephemeral", blocks: buildMissedDaysBlocks(missedDays) };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-slack-signature");
  const timestamp = req.headers.get("x-slack-request-timestamp");

  if (!verifySlackRequest(rawBody, timestamp, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const slackUserId = params.get("user_id");
  const responseUrl = params.get("response_url");
  if (!slackUserId || !responseUrl) return new Response("Bad request", { status: 400 });

  // Ack immediately — Slack requires a response within 3s, but the first DB query
  // after Neon's compute has been idle can take over a second on its own. Deliver
  // the real content asynchronously via response_url instead of risking the ack window.
  buildMissedDaysResponse(slackUserId)
    .then((body) =>
      fetch(responseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    )
    .catch((err) => console.error("Failed to deliver /timesheet response:", err));

  return Response.json({ response_type: "ephemeral", text: "Checking your missed days…" });
}
