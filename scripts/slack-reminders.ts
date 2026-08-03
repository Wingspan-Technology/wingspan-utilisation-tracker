import { prisma } from "@/lib/prisma";
import { getSlackClient, getMissedWeekdays, buildMissedDaysBlocks } from "@/lib/slack";

async function resolveSlackId(email: string): Promise<string | null> {
  try {
    const result = await getSlackClient().users.lookupByEmail({ email });
    return result.user?.id ?? null;
  } catch {
    return null; // not found in the Slack workspace
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const users = await prisma.user.findMany({ where: { isActive: true } });
  console.log(`Checking ${users.length} active user(s) for missed utilisation entries…${dryRun ? " (dry run — no DMs will be sent)" : ""}`);

  let sent = 0;
  for (const user of users) {
    const slackUserId = user.slackUserId ?? (await resolveSlackId(user.email));
    if (!slackUserId) {
      console.log(`- ${user.email}: no matching Slack account, skipped`);
      continue;
    }
    if (!user.slackUserId) {
      await prisma.user.update({ where: { id: user.id }, data: { slackUserId } });
    }

    const missedDays = await getMissedWeekdays(user.id);
    if (missedDays.length === 0) {
      console.log(`- ${user.email}: up to date`);
      continue;
    }

    if (dryRun) {
      console.log(`- ${user.email}: would remind (${missedDays.length} missed day(s))`);
    } else {
      await getSlackClient().chat.postMessage({
        channel: slackUserId,
        text: `You have ${missedDays.length} missed utilisation ${missedDays.length === 1 ? "entry" : "entries"}.`,
        blocks: buildMissedDaysBlocks(missedDays) as never,
      });
      console.log(`- ${user.email}: reminded (${missedDays.length} missed day(s))`);
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
