import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { DefaultLogger, LogWriter } from "drizzle-orm";
import { Axiom } from "@axiomhq/js";
import * as schema from "./schema.js";

class DrizzleLogWriter implements LogWriter {
  private axiom: Axiom;
  private axiomDataset: string;

  constructor() {
    this.axiom = new Axiom({
      token: process.env.AXIOM_TOKEN!,
    });

    this.axiomDataset = process.env.AXIOM_DATASET!;
  }

  write(message: string) {
    this.axiom.ingest(this.axiomDataset, [message]);
  }
}

const logger = new DefaultLogger({ writer: new DrizzleLogWriter() });

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema, logger });

export * from "./schema.js";
export * from "drizzle-orm";
