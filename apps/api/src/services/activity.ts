import type { DbClient, Tx } from "../database/client";
import { activityLogs } from "../database/schema";
import type { ActivityTone } from "../constants";
import { newId } from "../utils/id";

type Executor = DbClient | Tx;

export interface ActivityInput {
  actor: string;
  action: string;
  detail?: string;
  tone?: ActivityTone;
  userId?: string | null;
}

export async function logActivity(executor: Executor, input: ActivityInput): Promise<void> {
  await executor.insert(activityLogs).values({
    id: newId("act"),
    actor: input.actor,
    action: input.action,
    detail: input.detail ?? "",
    tone: input.tone ?? "info",
    userId: input.userId ?? null,
  });
}
