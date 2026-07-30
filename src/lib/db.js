import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const emptyStore = () => ({
  users: [],
  sites: [],
  conversations: [],
  messages: [],
  sessions: [],
});

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(emptyStore(), null, 2));
  }
}

export async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(STORE_PATH, "utf8");
  return JSON.parse(raw);
}

export async function writeStore(store) {
  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function updateStore(mutator) {
  const store = await readStore();
  const next = await mutator(store);
  await writeStore(next || store);
  return next || store;
}

export function id(prefix = "") {
  return prefix ? `${prefix}_${nanoid(10)}` : nanoid(12);
}
