import * as net from "net";
import { strict as assert } from "assert";

/**
 * Runs an end-to-end test by connecting to the server, sending a message,
 * and verifying that the echoed responses are as expected.
 */
async function runSingleTest(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const client = net.createConnection(
      { host: "127.0.0.1", port: 8000 },
      () => {
        // Send a single message.
        client.write("Hello\n");
      }
    );

    let step = 0;

    client.on("data", (data: Buffer) => {
      const response = data.toString();
      try {
        if (step === 0) {
          // First response should echo "Hello\n" with the prefix.
          assert.strictEqual(response, "Echo: Hello\n");
          // Now send quit command to gracefully close the connection.
          client.write("quit\n");
          step++;
        } else if (step === 1) {
          // Quit response should be "Bye.\n".
          assert.strictEqual(response, "Bye.\n");
          client.end();
          console.log("Single request test passed 🚀");
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

/**
 * Runs a pipelining test by connecting to the server and sending pipelined messages.
 * This test simulates the terminal command:
 *    echo -e 'hell\n1234' | socat TCP:127.0.0.1:8000 -
 * Expecting the server to echo each message.
 */
async function runPipeliningTest(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const client = net.createConnection(
      { host: "127.0.0.1", port: 8000 },
      () => {
        // Send pipelined messages and a quit command so the server closes the connection.
        client.write("hell\n1234\nquit\n");
      }
    );

    let received = "";
    client.on("data", (data: Buffer) => {
      received += data.toString();
    });

    client.on("end", () => {
      try {
        // Expected responses: echo for "hell", echo for "1234", and "Bye.\n" for quit.
        const responses = received.match(/.*\n/g) || [];
        assert.deepStrictEqual(responses, [
          "Echo: hell\n",
          "Echo: 1234\n",
          "Bye.\n",
        ]);
        console.log("Pipelining test passed 🚀");
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    client.on("error", (err: Error) => {
      reject(err);
    });
  });
}

/**
 * Run both tests sequentially.
 */
async function main() {
  console.log("Starting single request test...");
  await runSingleTest();
  console.log("Starting pipelining test...");
  await runPipeliningTest();
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
