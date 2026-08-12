import { NextRequest } from "next/server";
import {
  verifySlackRequest,
  resolveAppUser,
  getSlackClient,
  buildEntryModalView,
  parseModalState,
} from "@/lib/slack";
import { createTimeEntry, TimeEntryValidationError } from "@/lib/time-entries";

interface SlackAction {
  action_id: string;
  value?: string;
  selected_option?: { value: string };
}

interface SlackInteractionPayload {
  type: "block_actions" | "view_submission" | string;
  trigger_id?: string;
  user: { id: string };
  actions?: SlackAction[];
  view?: {
    id: string;
    hash: string;
    private_metadata: string;
    state: { values: Record<string, Record<string, { selected_option?: { value: string }; value?: string }>> };
  };
}

function getDate(view: { private_metadata: string }): string {
  return JSON.parse(view.private_metadata).date;
}

async function handleBlockActions(payload: SlackInteractionPayload) {
  const action = payload.actions?.[0];
  if (!action) return;
  const slack = getSlackClient();

  if (action.action_id.startsWith("select_missed_day_") && payload.trigger_id && action.value) {
    await slack.views.open({
      trigger_id: payload.trigger_id,
      view: (await buildEntryModalView({ date: action.value })) as never,
    });
    return;
  }

  if (!payload.view) return;
  const date = getDate(payload.view);
  const current = parseModalState(payload.view.state.values);
  const selected = action.selected_option?.value;

  let next: { clientId?: string; projectId?: string; taskId?: string } = {};
  if (action.action_id === "client_select") {
    next = { clientId: selected };
  } else if (action.action_id === "project_select") {
    next = { clientId: current.clientId, projectId: selected };
  } else if (action.action_id === "task_select") {
    next = { clientId: current.clientId, projectId: current.projectId, taskId: selected };
  } else {
    return;
  }

  await slack.views.update({
    view_id: payload.view.id,
    hash: payload.view.hash,
    view: (await buildEntryModalView({ date, ...next })) as never,
  });
}

async function handleViewSubmission(payload: SlackInteractionPayload) {
  if (!payload.view) return Response.json({});
  const date = getDate(payload.view);
  const { taskId, hours, notes } = parseModalState(payload.view.state.values);

  const parsedHours = hours ? parseFloat(hours) : NaN;
  const errors: Record<string, string> = {};
  if (!taskId) errors.task_block = "Please select a task.";
  if (!hours || isNaN(parsedHours) || parsedHours <= 0 || parsedHours > 24) {
    errors.hours_block = "Enter hours between 0 and 24.";
  }
  if (!notes?.trim()) errors.notes_block = "Please describe the work carried out.";
  if (Object.keys(errors).length > 0) {
    return Response.json({ response_action: "errors", errors });
  }

  const user = await resolveAppUser(payload.user.id);
  if (!user) {
    return Response.json({
      response_action: "errors",
      errors: { client_block: "Couldn't match your Slack account to a Wingspan user." },
    });
  }

  try {
    const entry = await createTimeEntry({
      userId: user.id,
      taskId: taskId!,
      date,
      hours: parsedHours,
      description: notes,
    });

    // Fire-and-forget: the dyno stays up after this request, so no need to block the
    // 3s Slack ack on a confirmation DM.
    getSlackClient()
      .chat.postMessage({
        channel: payload.user.id,
        text: `Logged ${entry.hours}h on *${entry.task.name}* (${entry.task.project.client.name} / ${entry.task.project.name}) for ${date}.`,
      })
      .catch((err) => console.error("Slack confirmation DM failed:", err));

    return Response.json({ response_action: "clear" });
  } catch (err) {
    if (err instanceof TimeEntryValidationError) {
      return Response.json({ response_action: "errors", errors: { task_block: err.message } });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-slack-signature");
  const timestamp = req.headers.get("x-slack-request-timestamp");

  if (!verifySlackRequest(rawBody, timestamp, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payload = JSON.parse(params.get("payload") ?? "{}") as SlackInteractionPayload;

  if (payload.type === "block_actions") {
    await handleBlockActions(payload);
    return new Response(null, { status: 200 });
  }

  if (payload.type === "view_submission") {
    return handleViewSubmission(payload);
  }

  return new Response(null, { status: 200 });
}
