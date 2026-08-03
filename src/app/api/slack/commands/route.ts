import { NextRequest } from "next/server";
import { verifySlackRequest, resolveAppUser, getMissedWeekdays, buildMissedDaysBlocks } from "@/lib/slack";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-slack-signature");
  const timestamp = req.headers.get("x-slack-request-timestamp");

  if (!verifySlackRequest(rawBody, timestamp, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const slackUserId = params.get("user_id");
  if (!slackUserId) return new Response("Bad request", { status: 400 });

  const user = await resolveAppUser(slackUserId);
  if (!user) {
    return Response.json({
      response_type: "ephemeral",
      text: "I couldn't match your Slack account to a Wingspan Utilisation Tracker user. Ask an admin to check your account email.",
    });
  }

  const missedDays = await getMissedWeekdays(user.id);

  return Response.json({
    response_type: "ephemeral",
    blocks: buildMissedDaysBlocks(missedDays),
  });
}
