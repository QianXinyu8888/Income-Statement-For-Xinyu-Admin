export const LIVE_QUERY_INTERVAL_MS = 15_000;

export const LIVE_QUERY_OPTIONS = {
  refetchInterval: LIVE_QUERY_INTERVAL_MS,
  refetchIntervalInBackground: false,
} as const;
