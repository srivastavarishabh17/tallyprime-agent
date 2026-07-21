export interface SyncStatus {
  running: boolean;
  lastStart: string | null;
  lastSuccess: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  cyclesCompleted: number;
}

export const syncStatus: SyncStatus = {
  running: false,
  lastStart: null,
  lastSuccess: null,
  lastError: null,
  lastErrorAt: null,
  cyclesCompleted: 0,
};
