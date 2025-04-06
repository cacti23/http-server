import * as net from "net";
import { strict as assert } from "assert";

/**
 * Runs an end-to-end test by connecting to the server, sending messages,
 * and verifying that the echoed responses are as expected.
 */
async function runTest(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Create a TCP client connection to the server.
    const client = net.createConnection(
      { host: "127.0.0.1", port: 8000 },
      () => {
        // Send the first message to be echoed.
        client.write("Hello\n");
      }
    );

    // Use a variable to track test progress.
    let step = 0;

    client.on("data", (data: Buffer) => {
      const response = data.toString();
      try {
        if (step === 0) {
          // First response should echo "Hello\n" with the prefix.
          assert.strictEqual(response, "Echo: Hello\n");
          // Send quit command on the same connection.
          client.write("quit\n");
          step++;
        } else if (step === 1) {
          // Quit response should be "Bye.\n".
          assert.strictEqual(response, "Bye.\n");
          client.end(); // End the connection.
          console.log("All tests passed");
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    });

    client.on("error", (err: Error) => {
      reject(err);
    });
  });
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
