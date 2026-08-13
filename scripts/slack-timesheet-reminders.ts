import { prisma } from "@/lib/prisma";
import { getSlackClient, buildTimesheetReminderBlocks } from "@/lib/slack";

async function resolveSlackId(email: string): Promise<string | null> {
  try {
    const result = await getSlackClient().users.lookupByEmail({ email });
    return result.user?.id ?? null;
  } catch {
    return null; // not found in the Slack workspace
  }
}

// Meant to run every 10 minutes via a scheduler with no per-timezone awareness of its
// own (e.g. Heroku Scheduler) — each user is only nudged once, in the first 10 minutes
// past 5pm in *their* timezone, however that lines up against the run cadence.
function getLocalParts(timezone: string, date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
    weekday: get("weekday"),
  };
}

function getArg(flag: string): string | undefined {
  const prefix = `${flag}=`;
  const arg = process.argv.find((a) => a === flag || a.startsWith(prefix));
  if (!arg) return undefined;
  if (arg.startsWith(prefix)) return arg.slice(prefix.length);
  return process.argv[process.argv.indexOf(arg) + 1];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const onlyEmail = getArg("--only");
  const now = new Date();

  // --only bypasses the role/isActive filter entirely — for testing against a specific
  // account (e.g. an admin) that wouldn't otherwise be a "developer" recipient.
  const developers = onlyEmail
    ? await prisma.user.findMany({ where: { email: { equals: onlyEmail, mode: "insensitive" } } })
    : await prisma.user.findMany({ where: { role: "USER", isActive: true } });
  console.log(`Checking ${developers.length} user(s) for 5pm local-time timesheet reminders…${onlyEmail ? ` (--only ${onlyEmail})` : ""}${dryRun ? " (dry run — no DMs will be sent)" : ""}`);

  let sent = 0;
  for (const user of developers) {
    const { dateStr, hour, minute, weekday } = getLocalParts(user.timezone, now);

    if (weekday === "Sat" || weekday === "Sun") continue;
    if (hour !== 17 || minute >= 10) continue;

    const alreadySentToday =
      user.lastTimesheetReminderAt != null &&
      getLocalParts(user.timezone, user.lastTimesheetReminderAt).dateStr === dateStr;
    if (alreadySentToday) continue;

    const loggedToday = await prisma.timeEntry.findFirst({
      where: { userId: user.id, date: new Date(dateStr + "T00:00:00.000Z") },
    });
    if (loggedToday) {
      console.log(`- ${user.email}: already logged time today, skipped`);
      continue;
    }

    const slackUserId = user.slackUserId ?? (await resolveSlackId(user.email));
    if (!slackUserId) {
      console.log(`- ${user.email}: no matching Slack account, skipped`);
      continue;
    }
    if (!user.slackUserId) {
      await prisma.user.update({ where: { id: user.id }, data: { slackUserId } });
    }

    if (dryRun) {
      console.log(`- ${user.email}: would remind (local time ${dateStr} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")})`);
    } else {
      await getSlackClient().chat.postMessage({
        channel: slackUserId,
        text: "It's 5pm — don't forget to log today's time!",
        blocks: buildTimesheetReminderBlocks(dateStr) as never,
      });
      await prisma.user.update({ where: { id: user.id }, data: { lastTimesheetReminderAt: now } });
      console.log(`- ${user.email}: reminded`);
    }
    sent++;
  }

  console.log(`Done. Sent ${sent} reminder(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
