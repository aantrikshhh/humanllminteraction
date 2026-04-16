import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import type { MatchResult, ReplayEnvelope } from "@arena/contracts";

import {
  cloneRoomRecord,
  type InMemoryRoomRuntime,
  type RoomRecord,
} from "./runtime.js";

export interface RoomPersistence {
  readonly enabled: boolean;
  loadRooms(): Promise<RoomRecord[]>;
  saveRoom(room: RoomRecord): Promise<void>;
}

export interface FileBackedRoomPersistenceOptions {
  rootDir: string;
}

export class NoopRoomPersistence implements RoomPersistence {
  readonly enabled = false;

  async loadRooms(): Promise<RoomRecord[]> {
    return [];
  }

  async saveRoom(_room: RoomRecord): Promise<void> {
    return;
  }
}

export class FileBackedRoomPersistence implements RoomPersistence {
  readonly enabled = true;
  private writeQueue = Promise.resolve();

  constructor(private readonly options: FileBackedRoomPersistenceOptions) {}

  async loadRooms(): Promise<RoomRecord[]> {
    await mkdir(this.roomsDir, { recursive: true });
    const entries = await readdir(this.roomsDir, { withFileTypes: true });
    const roomFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort();

    const rooms: RoomRecord[] = [];
    for (const fileName of roomFiles) {
      const payload = await readFile(join(this.roomsDir, fileName), "utf8");
      rooms.push(JSON.parse(payload) as RoomRecord);
    }

    return rooms;
  }

  async saveRoom(room: RoomRecord): Promise<void> {
    const snapshot = cloneRoomRecord(room);
    await this.enqueueWrite(async () => {
      await mkdir(this.rootDir, { recursive: true });
      await atomicWriteJson(this.roomFilePath(snapshot.roomId), snapshot);
      await atomicWriteJson(this.replayFilePath(snapshot.roomId), toReplayEnvelope(snapshot));

      if (snapshot.result) {
        await atomicWriteJson(this.resultFilePath(snapshot.roomId), snapshot.result);
        return;
      }

      await rm(this.resultFilePath(snapshot.roomId), { force: true });
    });
  }

  private enqueueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(operation, operation);
    this.writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private get rootDir(): string {
    return this.options.rootDir;
  }

  private get roomsDir(): string {
    return join(this.rootDir, "rooms");
  }

  private roomFilePath(roomId: string): string {
    return join(this.roomsDir, `${roomId}.json`);
  }

  private replayFilePath(roomId: string): string {
    return join(this.rootDir, "replays", `${roomId}.json`);
  }

  private resultFilePath(roomId: string): string {
    return join(this.rootDir, "results", `${roomId}.json`);
  }
}

export function createRoomPersistenceFromEnv(): RoomPersistence {
  const enabled = parseBoolean(process.env.ROOMS_PERSISTENCE_ENABLED, true);
  if (!enabled) {
    return new NoopRoomPersistence();
  }

  return new FileBackedRoomPersistence({
    rootDir:
      process.env.ROOMS_PERSISTENCE_DIR ??
      join(process.cwd(), ".arena", "rooms-state"),
  });
}

export async function restoreRuntimeFromPersistence(
  runtime: InMemoryRoomRuntime,
  persistence: RoomPersistence,
): Promise<number> {
  const rooms = await persistence.loadRooms();
  runtime.hydrateRooms(rooms);
  return rooms.length;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (typeof value === "undefined") {
    return defaultValue;
  }

  switch (value.trim().toLowerCase()) {
    case "0":
    case "false":
    case "no":
    case "off":
      return false;
    case "1":
    case "true":
    case "yes":
    case "on":
      return true;
    default:
      return defaultValue;
  }
}

function toReplayEnvelope(room: RoomRecord): ReplayEnvelope {
  return {
    matchId: room.matchId,
    game: room.game,
    version: 1,
    seed: room.matchId,
    createdAt: room.createdAt,
    events: room.replay,
  };
}

async function atomicWriteJson(filePath: string, payload: RoomRecord | ReplayEnvelope | MatchResult): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tempPath = join(
    dirname(filePath),
    `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );

  // Node's fs docs warn against overlapping writes to the same path; writes are serialized
  // above and each file is replaced via same-directory rename after the flushed temp write.
  await writeFile(tempPath, `${JSON.stringify(payload, null, 2)}\n`, {
    encoding: "utf8",
    flush: true,
  });
  await rename(tempPath, filePath);
}
