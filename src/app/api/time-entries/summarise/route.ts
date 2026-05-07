import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSession } from "@/lib/auth";

const anthropic = new Anthropic();

interface EntryInput {
  developer: string;
  task: string;
  project: string;
  client: string;
  hours: number;
  description: string | null;
  isBillable: boolean;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorised" }, { status: 401 });

  const { entries, date } = await req.json() as { entries: EntryInput[]; date: string };

  if (!entries?.length) {
    return Response.json({ error: "No entries provided" }, { status: 400 });
  }

  const entryLines = entries
    .map((e) => {
      const parts = [`- **${e.developer}**: ${e.task} (${e.project} / ${e.client}) — ${e.hours}h`];
      if (e.description) parts.push(`  Notes: ${e.description}`);
      return parts.join("\n");
    })
    .join("\n");

  const totalHours = entries.reduce((s, e) => s + e.hours, 0);
  const billableHours = entries.filter((e) => e.isBillable).reduce((s, e) => s + e.hours, 0);

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system:
      "You are a helpful assistant that summarises a team's daily work log. " +
      "Write one short paragraph per developer, starting each paragraph with their name in bold (e.g. **Jane Smith**). " +
      "Keep the total under 150 words across all paragraphs. " +
      "Focus only on what was done that specific day — no generalisations, no filler. " +
      "Synthesise each person's tasks into readable sentences; do not repeat the raw list. " +
      "Write directly and actively.",
    messages: [
      {
        role: "user",
        content: `Summarise this work log for ${date}, one paragraph per developer, total under 150 words:\n\n${entryLines}\n\nTotal: ${totalHours}h (${billableHours}h billable)`,
      },
    ],
  });

  const summary = message.content[0].type === "text" ? message.content[0].text : "";
  return Response.json({ summary });
}
