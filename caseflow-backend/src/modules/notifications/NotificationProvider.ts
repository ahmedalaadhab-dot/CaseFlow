import { NotificationType } from "@prisma/client";

export interface NotificationPayload {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  relatedCaseId?: string;
}

// Any delivery channel (in-app, WhatsApp, SMS, Email, Push) implements
// this single method. NotificationService (below) always creates the
// in-app Notification row, then fans out to whichever providers are
// registered — so adding WhatsApp later means writing one new class
// and adding it to the `channels` array, with zero changes to callers
// that trigger notifications (case assignment, overdue checks, etc).
export interface NotificationProvider {
  readonly channel: string;
  send(payload: NotificationPayload): Promise<void>;
}
