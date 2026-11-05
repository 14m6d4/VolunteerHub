/**
 * One reminder pass (services/reminder.service.ts): emails and notifies every
 * approved volunteer whose event starts within 24 hours and who has not been
 * reminded yet. Safe to run as often as you like and from several places at
 * once; each registration is reminded at most once.
 *
 * Production runs the compiled `node dist/scripts/send-reminders.js` every 15
 * minutes from the `reminders` compose service. Locally: npm run reminders:send
 */
import 'dotenv/config';
import { closeDb } from '../db/client.ts';
import { sendDueReminders } from '../services/reminder.service.ts';

try {
  const run = await sendDueReminders();
  console.log(`reminders: ${run.registrationIds.length} due, ${run.emailed} emailed, ${run.failed} failed`);
  if (run.failed) process.exitCode = 1;
} catch (err) {
  console.error(`reminders: run failed: ${(err as Error).message}`);
  process.exitCode = 1;
} finally {
  await closeDb();
}
process.exit();
