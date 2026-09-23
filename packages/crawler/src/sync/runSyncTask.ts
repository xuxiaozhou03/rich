import { randomUUID } from "node:crypto";

import { Prisma, prisma } from "@quant-backtest/db";

import {
  errorMessage,
  type TaskOutcome,
} from "../utils/fetchResult";

export interface SyncRunResult {
  taskKey: string;
  status: "success" | "empty" | "failed" | "skipped";
  resultCode: string;
  message?: string;
}

interface RunSyncTaskOptions<T> {
  taskKey: string;
  ttlMs: number;
  emptyTtlMs: number;
  retryBaseMs: number;
  force?: boolean;
  execute: () => Promise<TaskOutcome<T>>;
  persist: (data: T, raw: unknown) => Promise<void>;
}

async function claimTask(
  taskKey: string,
  runId: string,
  force: boolean,
): Promise<boolean> {
  const now = new Date();
  const lockAvailable: Prisma.SyncTaskWhereInput = {
    OR: [
      { status: { not: "running" } },
      { lockedUntil: null },
      { lockedUntil: { lt: now } },
    ],
  };
  const due: Prisma.SyncTaskWhereInput = {
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { lte: now } }] },
      { OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }] },
    ],
  };

  await prisma.syncTask.upsert({
    where: { taskKey },
    create: { taskKey, status: "idle" },
    update: {},
  });

  const claimed = await prisma.syncTask.updateMany({
    where: {
      taskKey,
      AND: force ? [lockAvailable] : [lockAvailable, due],
    },
    data: {
      status: "running",
      runId,
      lockedUntil: new Date(now.getTime() + 15 * 60_000),
      lastStartedAt: now,
      lastFinishedAt: null,
    },
  });

  return claimed.count === 1;
}

async function finishTask(
  taskKey: string,
  runId: string,
  data: Prisma.SyncTaskUpdateManyMutationInput,
): Promise<void> {
  await prisma.syncTask.updateMany({
    where: { taskKey, runId },
    data: {
      ...data,
      runId: null,
      lockedUntil: null,
      lastFinishedAt: new Date(),
    },
  });
}

export async function runSyncTask<T>(
  options: RunSyncTaskOptions<T>,
): Promise<SyncRunResult> {
  const runId = randomUUID();
  const claimed = await claimTask(options.taskKey, runId, options.force ?? false);
  if (!claimed) {
    return {
      taskKey: options.taskKey,
      status: "skipped",
      resultCode: "not_due",
    };
  }

  try {
    const outcome = await options.execute();

    if (outcome.kind === "skipped") {
      await finishTask(options.taskKey, runId, {
        status: "success",
        resultCode: outcome.reason,
        expiresAt: new Date(Date.now() + options.ttlMs),
        nextRetryAt: null,
        lastSuccessAt: new Date(),
        errorType: null,
        errorMessage: null,
        consecutiveFailures: 0,
      });
      return {
        taskKey: options.taskKey,
        status: "skipped",
        resultCode: outcome.reason,
      };
    }

    if (outcome.kind === "empty") {
      const retryAt = new Date(Date.now() + options.emptyTtlMs);
      await finishTask(options.taskKey, runId, {
        status: "empty",
        resultCode: outcome.reason,
        expiresAt: retryAt,
        nextRetryAt: retryAt,
        errorType: null,
        errorMessage: null,
      });
      return {
        taskKey: options.taskKey,
        status: "empty",
        resultCode: outcome.reason,
      };
    }

    if (outcome.kind === "error") {
      const retryDelay = outcome.error.retryable
        ? options.retryBaseMs
        : Math.max(options.retryBaseMs, 60 * 60_000);
      await finishTask(options.taskKey, runId, {
        status: "failed",
        resultCode: outcome.error.errorType,
        nextRetryAt: new Date(Date.now() + retryDelay),
        lastErrorAt: new Date(),
        errorType: outcome.error.errorType,
        errorMessage: outcome.error.message,
        consecutiveFailures: { increment: 1 },
      });
      return {
        taskKey: options.taskKey,
        status: "failed",
        resultCode: outcome.error.errorType,
        message: outcome.error.message,
      };
    }

    await options.persist(outcome.data, outcome.raw);
    await finishTask(options.taskKey, runId, {
      status: "success",
      resultCode: "success",
      expiresAt: new Date(Date.now() + options.ttlMs),
      nextRetryAt: null,
      lastSuccessAt: new Date(),
      errorType: null,
      errorMessage: null,
      consecutiveFailures: 0,
    });
    return {
      taskKey: options.taskKey,
      status: "success",
      resultCode: "success",
    };
  } catch (error) {
    const message = errorMessage(error);
    await finishTask(options.taskKey, runId, {
      status: "failed",
      resultCode: "persist",
      nextRetryAt: new Date(Date.now() + options.retryBaseMs),
      lastErrorAt: new Date(),
      errorType: "schema",
      errorMessage: message,
      consecutiveFailures: { increment: 1 },
    });
    return {
      taskKey: options.taskKey,
      status: "failed",
      resultCode: "persist",
      message,
    };
  }
}
