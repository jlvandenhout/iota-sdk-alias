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
    // Generate a random BIP39 mnemonic
    const mnemonic = Utils.generateMnemonic();
    console.log("Mnemonic: " + mnemonic);

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

    // A mnemonic can be generated with `Utils.generateMnemonic()`.
    // Store the mnemonic in the Stronghold snapshot, this needs to be done only the first time.
    // The mnemonic can't be retrieved from the Stronghold file, so make a backup in a secure place!
    await wallet.storeMnemonic(mnemonic);

    // Create a new account
    const account = await wallet.createAccount({
      alias: "Alice",
    });
    console.log("Generated new account:", account.getMetadata().alias);

    // Request funds.
    const faucetUrl = process.env.FAUCET_URL;

    const address = (await account.addresses())[0].address;
    console.log("Address:", address);

    const faucetResponse = await (
      await wallet.getClient()
    ).requestFundsFromFaucet(faucetUrl, address);
    console.log("Faucet response:\n", faucetResponse);

    // Create an alias.
    // May want to ensure the account is synced before sending a transaction.
    let balance = await account.sync();

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
    console.log(
      `Transaction included: ${process.env.EXPLORER_URL}/block/${blockId}`
    );

    balance = await account.sync();
    console.log(
      `Aliases AFTER (${balance.aliases.length}):\n`,
      balance.aliases
    );
  } catch (error) {
    console.error("Error: ", error);
  }
}

run().then(() => process.exit());
