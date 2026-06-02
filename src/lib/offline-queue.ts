import Dexie, { type Table } from "dexie";

export type OfflineQueueItem = {
  id?: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

class OfflineQueueDatabase extends Dexie {
  queue!: Table<OfflineQueueItem, number>;

  constructor() {
    super("kiruvo-offline-queue");
    this.version(1).stores({
      queue: "++id,type,createdAt",
    });
  }
}

const db = new OfflineQueueDatabase();

export async function enqueueOfflineAction(type: string, payload: Record<string, unknown>) {
  return db.queue.add({ type, payload, createdAt: new Date().toISOString() });
}

export async function getOfflineQueueCount() {
  return db.queue.count();
}

export async function listOfflineQueueItems() {
  return db.queue.orderBy("createdAt").toArray();
}
