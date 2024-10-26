import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { rimraf } from "rimraf";

export async function createTempDirectory() {
  const path = await mkdtemp(tmpdir());

  return {
    path,
    [Symbol.asyncDispose]: () => rimraf(path, { maxRetries: 10 }) as unknown as Promise<void>,
  };
}
