// Copyright 2023 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { rm } from "fs/promises";

// This example uses secrets in environment variables for simplicity which should not be done in production.
import "dotenv/config";

async function run() {
  await rm(process.env.WALLET_DB_PATH, { recursive: true, force: true });
  await rm(process.env.STRONGHOLD_SNAPSHOT_PATH, {
    recursive: true,
    force: true,
  });
}

run().then(() => process.exit());
