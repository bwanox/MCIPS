import { randomUUID } from "node:crypto";

import { env } from "../../../../shared/config/env.js";
import type { IncidentRecord, NotificationRecord } from "../../../../shared/types/platform.js";

export type NotificationKind = NotificationRecord["kind"];

export class EmailNotificationService {
  async sendIncidentNotification(
    incident: IncidentRecord,
    kind: NotificationKind,
    requiredAction?: string
  ): Promise<NotificationRecord> {
    const subject = `[${incident.severity.toUpperCase()}] ${incident.summary.slice(0, 80)}`;
    const body = {
      from: env.mailFrom,
      to: env.adminEmail,
      subject,
      text: [
        `Incident: ${incident.id}`,
        `Severity: ${incident.severity}`,
        `Summary: ${incident.summary}`,
        `Required action: ${requiredAction ?? "Review in dashboard"}`,
        `Dashboard: ${env.dashboardUrl}`,
        `Generated at: ${new Date().toISOString()}`,
        "Note: this email contains sanitized evidence only."
      ].join("\n")
    };

    let delivered = false;
    let deliveryStatus: NotificationRecord["deliveryStatus"] = "simulated";
    let provider = "dry_run";

    if (env.mailWebhookUrl) {
      try {
        const response = await fetch(env.mailWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          throw new Error(`mail webhook returned ${response.status}`);
        }
        provider = "webhook";
        delivered = true;
        deliveryStatus = "sent";
      } catch {
        delivered = false;
        deliveryStatus = "failed";
        provider = "webhook_failed";
      }
    }

    return {
      id: randomUUID(),
      kind,
      channel: "email",
      createdAt: new Date().toISOString(),
      delivered,
      deliveryStatus,
      subject,
      recipient: env.adminEmail,
      provider
    };
  }
}
