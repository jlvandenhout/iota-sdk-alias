// Copyright 2023 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Wallet, CoinType, initLogger, Utils } from "@iota/sdk";

// This example uses secrets in environment variables for simplicity which should not be done in production.
import "dotenv/config";

async function run() {
  initLogger();

  if (!process.env.NODE_URL) {
    throw new Error(".env NODE_URL is undefined, see .env.example");
  }
  if (!process.env.STRONGHOLD_PASSWORD) {
    throw new Error(".env STRONGHOLD_PASSWORD is undefined, see .env.example");
  }
  if (!process.env.STRONGHOLD_SNAPSHOT_PATH) {
    throw new Error(
      ".env STRONGHOLD_SNAPSHOT_PATH is undefined, see .env.example"
    );
  }
  if (!process.env.WALLET_DB_PATH) {
    throw new Error(".env WALLET_DB_PATH is undefined, see .env.example");
  }

  try {
    // Create a new database and account.
    const walletOptions = {
      storagePath: process.env.WALLET_DB_PATH,
      clientOptions: {
        nodes: [process.env.NODE_URL],
      },
      coinType: CoinType.Shimmer,
      secretManager: {
        stronghold: {
          snapshotPath: process.env.STRONGHOLD_SNAPSHOT_PATH,
          password: process.env.STRONGHOLD_PASSWORD,
        },
      },
    };

    const wallet = new Wallet(walletOptions);

    /////////////////////////////////////////////////////////////

    const MNEMONIC = await Utils.generateMnemonic();
    await wallet.storeMnemonic(MNEMONIC);
    // Create a new account
    const account = await wallet.createAccount({
      alias: "Alice",
    });
    console.log("Generated new account:", account.getMetadata().alias);

    const address = (await account.generateEd25519Addresses(1))[0];
    account.setDefaultSyncOptions({ syncOnlyMostBasicOutputs: true });

    /////////////////////////////////////////////////////////////

    const faucetUrl = process.env.FAUCET_URL;

    const faucetResponse = await (
      await wallet.getClient()
    ).requestFundsFromFaucet(faucetUrl, address);
    console.log("Faucet response:\n", faucetResponse);

    let balance = await account.sync();
    while (!balance.baseCoin.available) {
      // Check for balance every second.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      balance = await account.sync();
    }
    console.log("Balance:\n", balance);

    /////////////////////////////////////////////////////////////

    console.log("Generated new address", address);
    // let balance = await account.sync();

    console.log(
      `Aliases BEFORE (${balance.aliases.length}):\n`,
      balance.aliases
    );

    // To sign a transaction we need to unlock stronghold.
    await wallet.setStrongholdPassword(process.env.STRONGHOLD_PASSWORD);

    console.log("Sending the create-alias transaction...");

    // Create an alias
    const transaction = await account
      .prepareCreateAliasOutput()
      .then((prepared) => prepared.send());

    console.log(`Transaction sent: ${transaction.transactionId}`);

    // Wait for transaction to get included
    const blockId = await account.retryTransactionUntilIncluded(
      transaction.transactionId
    );
    ////////////////////////////////////////////////////////////////////////////////
  } catch (error) {
    console.error("Error: ", error);
  }
}

run().then(() => process.exit());
