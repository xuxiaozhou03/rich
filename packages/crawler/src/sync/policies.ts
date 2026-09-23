const minute = 60_000;
const hour = 60 * minute;

export const taskPolicies = {
  etfList: {
    ttlMs: 24 * hour,
    emptyTtlMs: hour,
    retryBaseMs: 10 * minute,
  },
  linkFund: {
    ttlMs: 24 * hour,
    emptyTtlMs: hour,
    retryBaseMs: 10 * minute,
  },
  holdAll: {
    ttlMs: 24 * hour,
    emptyTtlMs: hour,
    retryBaseMs: 10 * minute,
  },
  dayKv2: {
    ttlMs: 6 * hour,
    emptyTtlMs: 30 * minute,
    retryBaseMs: 10 * minute,
  },
  subscribeShare: {
    ttlMs: 5 * minute,
    emptyTtlMs: 5 * minute,
    retryBaseMs: 5 * minute,
  },
  klineCalculation: {
    ttlMs: 5 * minute,
    emptyTtlMs: 5 * minute,
    retryBaseMs: 5 * minute,
  },
} as const;
