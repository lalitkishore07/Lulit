import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

const DEFAULT_DB = {
  challenges: {},
  usernames: {},
  identities: {},
  messages: []
};

async function ensureStore() {
  const filePath = path.resolve(config.messageStoreFile);
  await mkdir(path.dirname(filePath), { recursive: true });
  try {
    await readFile(filePath, "utf8");
  } catch {
    await writeFile(filePath, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
  return filePath;
}

export async function readDb() {
  const filePath = await ensureStore();
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return {
    ...DEFAULT_DB,
    ...parsed,
    challenges: parsed?.challenges || {},
    usernames: parsed?.usernames || {},
    identities: parsed?.identities || {},
    messages: Array.isArray(parsed?.messages) ? parsed.messages : []
  };
}

export async function writeDb(nextValue) {
  const filePath = await ensureStore();
  await writeFile(filePath, JSON.stringify(nextValue, null, 2), "utf8");
}

export async function updateDb(mutator) {
  const current = await readDb();
  const nextValue = await mutator(current);
  await writeDb(nextValue);
  return nextValue;
}
