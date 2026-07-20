import { prisma } from "../../config/prisma";
import { NotificationProvider, NotificationPayload } from "./NotificationProvider";

// Always-on channel: writes the bell-icon notification row the frontend polls/reads.
class InAppNotificationProvider implements NotificationProvider {
  readonly channel = "in_app";

  async send(payload: NotificationPayload): Promise<void> {
    await prisma.notification.create({
      data: {
        recipientId: payload.recipientUserId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        relatedCaseId: payload.relatedCaseId,
      },
    });
  }
}

// Register future channels here, e.g.:
//   new WhatsAppNotificationProvider(),
//   new SmsNotificationProvider(),
//   new EmailNotificationProvider(),
//   new PushNotificationProvider(),
// Each is independent — one failing should not block the others.
const channels: NotificationProvider[] = [new InAppNotificationProvider()];

export const notificationService = {
  async notify(payload: NotificationPayload): Promise<void> {
    const results = await Promise.allSettled(channels.map((c) => c.send(payload)));
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(`Notification channel "${channels[i].channel}" failed:`, r.reason);
      }
    });
  },
};
