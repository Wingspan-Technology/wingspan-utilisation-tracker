import crypto from "crypto";
import { format } from "date-fns";
import { WebClient } from "@slack/web-api";
import { prisma } from "@/lib/prisma";

let client: WebClient | null = null;
export function getSlackClient() {
  if (!client) client = new WebClient(process.env.SLACK_BOT_TOKEN);
  return client;
}

// Slack signs every request with `v0:{timestamp}:{rawBody}` — must be verified against
// the raw, unparsed body, and rejected if older than 5 minutes to prevent replay.
export function verifySlackRequest(
  rawBody: string,
  timestamp: string | null,
  signature: string | null
): boolean {
  if (!timestamp || !signature) {
    console.error("[slack verify] missing timestamp or signature", { timestamp, signature });
    return false;
  }

  const ts = Number(timestamp);
  const skew = Math.abs(Date.now() / 1000 - ts);
  if (!Number.isFinite(ts) || skew > 60 * 5) {
    console.error("[slack verify] timestamp check failed", { timestamp, skew });
    return false;
  }

  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    console.error("[slack verify] SLACK_SIGNING_SECRET not set");
    return false;
  }

  const base = `v0:${timestamp}:${rawBody}`;
  const expected = "v0=" + crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  console.error("[slack verify]", { received: signature, expected, bodyLen: rawBody.length, secretLen: signingSecret.length });

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// Resolves a Slack user to an app User by cached slackUserId, falling back to an
// email lookup (Slack and Google Workspace share the wingspantechnology.com domain)
// and caching the result so future lookups skip the Slack API round trip.
export async function resolveAppUser(slackUserId: string) {
  const cached = await prisma.user.findUnique({ where: { slackUserId } });
  if (cached) return cached;

  const info = await getSlackClient().users.info({ user: slackUserId });
  const email = info.user?.profile?.email;
  if (!email) return null;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) return null;

  await prisma.user.update({ where: { id: user.id }, data: { slackUserId } });
  return user;
}

// A "missed day" is a weekday, strictly before today, with no TimeEntry for the user.
// Returned oldest-first as yyyy-MM-dd strings.
export async function getMissedWeekdays(userId: string, businessDays = 14): Promise<string[]> {
  const candidates: string[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - 1);

  while (candidates.length < businessDays) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) candidates.push(cursor.toISOString().split("T")[0]);
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  candidates.reverse();

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId,
      date: {
        gte: new Date(candidates[0] + "T00:00:00.000Z"),
        lte: new Date(candidates[candidates.length - 1] + "T23:59:59.999Z"),
      },
    },
    select: { date: true },
  });
  const logged = new Set(entries.map((e) => e.date.toISOString().split("T")[0]));

  return candidates.filter((d) => !logged.has(d));
}

export function buildMissedDaysBlocks(missedDays: string[]) {
  if (missedDays.length === 0) {
    return [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":white_check_mark: You're all caught up — no missed weekdays in the last two weeks.",
        },
      },
    ];
  }

  const blocks: Record<string, unknown>[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `You're missing utilisation entries for *${missedDays.length}* day${missedDays.length === 1 ? "" : "s"}. Pick one to log:`,
      },
    },
  ];

  const MAX_BUTTONS_PER_BLOCK = 5;
  for (let i = 0; i < missedDays.length; i += MAX_BUTTONS_PER_BLOCK) {
    blocks.push({
      type: "actions",
      elements: missedDays.slice(i, i + MAX_BUTTONS_PER_BLOCK).map((date) => ({
        type: "button",
        text: { type: "plain_text", text: format(new Date(date + "T00:00:00"), "EEE d MMM") },
        action_id: "select_missed_day",
        value: date,
      })),
    });
  }

  return blocks;
}

function selectOption(id: string, label: string) {
  return { text: { type: "plain_text" as const, text: label.slice(0, 75) }, value: id };
}

// Progressively grows the modal as client -> project -> task are chosen, the standard
// Slack "cascading select" pattern (each select has dispatch_action so choosing a value
// triggers a block_actions event we respond to with views.update).
export async function buildEntryModalView(opts: {
  date: string;
  clientId?: string;
  projectId?: string;
  taskId?: string;
}) {
  const { date, clientId, projectId, taskId } = opts;

  const [clients, projects, tasks] = await Promise.all([
    prisma.client.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    clientId
      ? prisma.project.findMany({ where: { clientId, isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
    projectId
      ? prisma.task.findMany({ where: { projectId, isActive: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ]);

  const blocks: Record<string, unknown>[] = [
    {
      type: "section",
      block_id: "date_context",
      text: {
        type: "mrkdwn",
        text: `Logging time for *${format(new Date(date + "T00:00:00"), "EEEE, d MMMM yyyy")}*`,
      },
    },
    {
      type: "input",
      block_id: "client_block",
      dispatch_action: true,
      label: { type: "plain_text", text: "Client" },
      element: {
        type: "static_select",
        action_id: "client_select",
        placeholder: { type: "plain_text", text: "Select a client" },
        options: clients.map((c) => selectOption(c.id, c.name)),
        ...(clientId ? { initial_option: selectOption(clientId, clients.find((c) => c.id === clientId)!.name) } : {}),
      },
    },
  ];

  if (clientId) {
    blocks.push({
      type: "input",
      block_id: "project_block",
      dispatch_action: true,
      label: { type: "plain_text", text: "Project" },
      element: {
        type: "static_select",
        action_id: "project_select",
        placeholder: { type: "plain_text", text: "Select a project" },
        options: projects.map((p) => selectOption(p.id, p.name)),
        ...(projectId ? { initial_option: selectOption(projectId, projects.find((p) => p.id === projectId)!.name) } : {}),
      },
    });
  }

  if (projectId) {
    blocks.push({
      type: "input",
      block_id: "task_block",
      dispatch_action: true,
      label: { type: "plain_text", text: "Task" },
      element: {
        type: "static_select",
        action_id: "task_select",
        placeholder: { type: "plain_text", text: "Select a task" },
        options: tasks.map((t) => selectOption(t.id, `${t.isBillable ? "💰" : "🌱"} ${t.name}`)),
        ...(taskId
          ? { initial_option: selectOption(taskId, (() => { const t = tasks.find((t) => t.id === taskId)!; return `${t.isBillable ? "💰" : "🌱"} ${t.name}`; })()) }
          : {}),
      },
    });
  }

  if (taskId) {
    blocks.push(
      {
        type: "input",
        block_id: "hours_block",
        label: { type: "plain_text", text: "Hours" },
        element: {
          type: "plain_text_input",
          action_id: "hours_input",
          initial_value: "8",
          placeholder: { type: "plain_text", text: "e.g. 3.5" },
        },
      },
      {
        type: "input",
        block_id: "notes_block",
        label: { type: "plain_text", text: "Notes" },
        element: {
          type: "plain_text_input",
          action_id: "notes_input",
          multiline: true,
          placeholder: { type: "plain_text", text: "What did you work on?" },
        },
      }
    );
  }

  return {
    type: "modal",
    callback_id: "log_time_submit",
    private_metadata: JSON.stringify({ date }),
    title: { type: "plain_text", text: "Log Time" },
    submit: { type: "plain_text", text: "Save" },
    close: { type: "plain_text", text: "Cancel" },
    blocks,
  };
}

export function parseModalState(values: Record<string, Record<string, { selected_option?: { value: string }; value?: string }>>) {
  return {
    clientId: values?.client_block?.client_select?.selected_option?.value,
    projectId: values?.project_block?.project_select?.selected_option?.value,
    taskId: values?.task_block?.task_select?.selected_option?.value,
    hours: values?.hours_block?.hours_input?.value,
    notes: values?.notes_block?.notes_input?.value,
  };
}
