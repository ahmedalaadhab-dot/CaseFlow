import { createApp } from "./app";
import { env } from "./config/env";
import { recurrenceService } from "./modules/cases/recurrence.service";

const app = createApp();

// Recurring cases have no separate worker/cron service to run on (this app
// deploys as a single web process — see render.yaml) so the check runs
// in-process instead: once at boot (to catch anything due while the server
// was down) and hourly after that. Due dates are day-granularity, so an
// hourly poll is more than fine. NOTE: if this service is ever scaled to
// multiple instances, this naive setInterval would run on each of them —
// recurrenceService.processDueRecurrences() is idempotent per due-date
// cycle (guarded by Case.recurrenceGeneratedAt) so it's still *safe*, but
// a real job queue/leader-election would be worth adding at that point.
const RECURRENCE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

async function runRecurrenceCheck() {
  try {
    const { processed, created } = await recurrenceService.processDueRecurrences();
    if (processed > 0) {
      console.log(`Recurring cases: generated ${processed} case(s): ${created.join(", ")}`);
    }
  } catch (err) {
    console.error("Recurring case check failed:", err);
  }
}

app.listen(env.PORT, () => {
  console.log(`🚀 CaseFlow API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  runRecurrenceCheck();
  setInterval(runRecurrenceCheck, RECURRENCE_CHECK_INTERVAL_MS);
});
