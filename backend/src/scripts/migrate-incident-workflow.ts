import mongoose from "mongoose";

import { AlertModel } from "../modules/alerts/infrastructure/models/alert.model.js";
import { EventLogModel } from "../modules/events/infrastructure/models/event-log.model.js";
import { IncidentModel } from "../modules/incidents/infrastructure/models/incident.model.js";
import { env } from "../shared/config/env.js";

type AnyDoc = Record<string, any>;

const uniqueBy = <T>(items: T[], key: (item: T) => string): T[] => {
  const values = new Map<string, T>();
  for (const item of items) {
    values.set(key(item), item);
  }
  return [...values.values()];
};

const severityRank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const priorityRank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };

const maxByRank = (left: string, right: string, ranks: Record<string, number>): string =>
  (ranks[right] ?? 0) > (ranks[left] ?? 0) ? right : left;

const mergeFragmentedIncident = async (fragmentedId: string, canonicalId: string): Promise<boolean> => {
  const [fragmentedDoc, canonicalDoc] = await Promise.all([
    IncidentModel.findOne({ id: fragmentedId }).lean(),
    IncidentModel.findOne({ id: canonicalId }).lean()
  ]);
  const fragmented = fragmentedDoc as AnyDoc | null;
  const canonical = canonicalDoc as AnyDoc | null;

  if (!fragmented || !canonical || fragmented.id === canonical.id) {
    return false;
  }

  const migratedAt = new Date().toISOString();
  const merged = {
    ...canonical,
    severity: maxByRank(canonical.severity, fragmented.severity, severityRank),
    triagePriority: maxByRank(canonical.triagePriority, fragmented.triagePriority, priorityRank),
    sourceFamilies: [...new Set([...(canonical.sourceFamilies ?? []), ...(fragmented.sourceFamilies ?? [])])],
    firstSeenAt: [canonical.firstSeenAt, fragmented.firstSeenAt].sort()[0],
    lastSeenAt: [canonical.lastSeenAt, fragmented.lastSeenAt].sort().at(-1),
    summary: fragmented.summary || canonical.summary,
    recommendedActions: [...new Set([...(canonical.recommendedActions ?? []), ...(fragmented.recommendedActions ?? [])])],
    correlatedSignals: uniqueBy(
      [...(canonical.correlatedSignals ?? []), ...(fragmented.correlatedSignals ?? [])].map((signal: any) => ({
        ...signal,
        incidentId: canonicalId
      })),
      (signal: any) => signal.alertId ?? `${signal.eventId}:${signal.timestamp}`
    ),
    timeline: uniqueBy([...(canonical.timeline ?? []), ...(fragmented.timeline ?? [])], (entry: any) => entry.id).sort(
      (left: any, right: any) => String(left.occurredAt).localeCompare(String(right.occurredAt))
    ),
    evidence: uniqueBy(
      [...(canonical.evidence ?? []), ...(fragmented.evidence ?? [])],
      (entry: any) => entry.id ?? `${entry.alertId}:${entry.eventId}`
    ),
    auditTrail: [
      ...(canonical.auditTrail ?? []),
      ...(fragmented.auditTrail ?? []),
      {
        id: `migration-${fragmentedId}`,
        kind: "status_updated",
        message: `Merged fragmented incident ${fragmentedId} into canonical incident ${canonicalId}`,
        createdAt: migratedAt
      }
    ],
    actions: uniqueBy(
      [...(canonical.actions ?? []), ...(fragmented.actions ?? [])].map((action: any) => ({
        ...action,
        incidentId: canonicalId,
        status: action.status === "requested" ? "pending" : action.status
      })),
      (action: any) => action.actionKey ?? action.id
    ),
    notifications: uniqueBy([...(canonical.notifications ?? []), ...(fragmented.notifications ?? [])], (entry: any) => entry.id),
    latestAlertId: fragmented.latestAlertId || canonical.latestAlertId,
    latestEventId: fragmented.latestEventId || canonical.latestEventId,
    mitre: uniqueBy([...(canonical.mitre ?? []), ...(fragmented.mitre ?? [])], (entry: any) =>
      `${entry.techniqueId}:${(entry.evidenceIds ?? []).join(",")}`
    ),
    threatIntel: uniqueBy([...(canonical.threatIntel ?? []), ...(fragmented.threatIntel ?? [])], (entry: any) =>
      `${entry.type}:${entry.value}`
    ),
    graph: fragmented.graph ?? canonical.graph
  };

  delete (merged as { _id?: unknown })._id;
  await IncidentModel.replaceOne({ id: canonicalId }, merged);
  await IncidentModel.deleteOne({ id: fragmentedId });
  return true;
};

const main = async (): Promise<void> => {
  await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5_000 });

  const actionMigration = await IncidentModel.collection.updateMany(
    { "actions.status": "requested" },
    { $set: { "actions.$[action].status": "pending" } },
    { arrayFilters: [{ "action.status": "requested" }] }
  );

  const signalMigration = await IncidentModel.collection.updateMany(
    { "correlatedSignals": { $elemMatch: { incidentId: { $exists: false } } } },
    [
      {
        $set: {
          correlatedSignals: {
            $map: {
              input: "$correlatedSignals",
              as: "signal",
              in: { $mergeObjects: ["$$signal", { incidentId: "$id" }] }
            }
          }
        }
      }
    ]
  );

  let mergedIncidents = 0;
  const correlatedAlerts = await AlertModel.find({ correlationDetected: true }).lean();
  for (const alert of correlatedAlerts as any[]) {
    const currentIncidentId = String(alert.incidentId ?? "");
    const firstSignal = Array.isArray(alert.correlatedSignals) ? alert.correlatedSignals[0] : undefined;
    let canonicalIncidentId = typeof firstSignal?.incidentId === "string" ? firstSignal.incidentId : "";

    if (!canonicalIncidentId && typeof firstSignal?.alertId === "string") {
      const matchedAlert = await AlertModel.findOne({ id: firstSignal.alertId }).select({ incidentId: 1 }).lean();
      canonicalIncidentId = String((matchedAlert as any)?.incidentId ?? "");
    }

    if (!canonicalIncidentId || canonicalIncidentId === currentIncidentId) {
      continue;
    }

    await Promise.all([
      AlertModel.updateOne(
        { id: alert.id },
        {
          $set: {
            incidentId: canonicalIncidentId,
            correlatedSignals: (alert.correlatedSignals ?? []).map((signal: any) => ({
              ...signal,
              incidentId: signal.incidentId ?? canonicalIncidentId
            }))
          }
        }
      ),
      EventLogModel.updateMany({ alertId: alert.id }, { $set: { incidentId: canonicalIncidentId } })
    ]);

    if (await mergeFragmentedIncident(currentIncidentId, canonicalIncidentId)) {
      mergedIncidents += 1;
    }
  }

  await mongoose.disconnect();
  console.log(
    JSON.stringify(
      {
        requestedActionsModified: actionMigration.modifiedCount,
        incidentSignalsModified: signalMigration.modifiedCount,
        mergedIncidents
      },
      null,
      2
    )
  );
};

main().catch(async (error: unknown) => {
  await mongoose.disconnect().catch(() => undefined);
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
