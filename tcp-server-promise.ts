import * as net from "net";

/**
 * Represents a TCP connection wrapper.
 * @typedef {Object} TCPConn
 * @property {net.Socket} socket - The underlying TCP socket.
 * @property {Error | null} err - The error encountered on the connection, if any.
 * @property {boolean} ended - Indicates whether the connection has ended.
 * @property {Object | null} reader - Callbacks for the current read operation.
 * @property {function(Buffer): void} reader.resolve - Callback to resolve the read promise.
 * @property {function(Error): void} reader.reject - Callback to reject the read promise.
 */
type TCPConn = {
  socket: net.Socket;
  err: null | Error;
  ended: boolean;
  // the callbacks of the promise of the current read operation
  reader: null | {
    resolve: (value: Buffer) => void;
    reject: (reason: Error) => void;
  };
};

/**
 * Writes data to the TCP connection.
 *
 * @param {TCPConn} conn - The TCP connection.
 * @param {Buffer} data - The data to write.
 * @returns {Promise<void>} - Resolves when data is successfully written, rejects on error.
 * @throws {Error} - If data length is zero.
 */
async function soWrite(conn: TCPConn, data: Buffer): Promise<void> {
  if (data.length === 0) {
    throw new Error("Data length must be greater than 0");
  }

  return new Promise((resolve, reject) => {
    if (conn.err) {
      reject(conn.err);
      return;
    }

    conn.socket.write(data, (err?: Error) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Reads data from the TCP connection.
 *
 * @param {TCPConn} conn - The TCP connection.
 * @returns {Promise<Buffer>} - Resolves with the received data, or an empty buffer if the connection ended.
 * @throws {Error} - If another read operation is already in progress.
 */
function soRead(conn: TCPConn): Promise<Buffer> {
  if (conn.reader !== null) {
    throw new Error("Concurrent read operations not allowed");
  }

  return new Promise((resolve, reject) => {
    if (conn.err) {
      reject(conn.err);
      return;
    }
    if (conn.ended) {
      resolve(Buffer.from(""));
      return;
    }
    conn.reader = { resolve, reject };
    // resume the socket to start receiving data
    conn.socket.resume();
  });
}

/**
 * Initializes the TCP connection by setting up event listeners.
 *
 * @param {net.Socket} socket - The TCP socket.
 * @returns {TCPConn} - The initialized TCP connection.
 */
function soInit(socket: net.Socket): TCPConn {
  const conn: TCPConn = {
    socket,
    err: null,
    ended: false,
    reader: null,
  };
  socket.on("data", (data: Buffer) => {
    if (!conn.reader) {
      throw Error("No reader available");
    }
    // pause the "date" event until the next read operation
    conn.socket.pause();
    // resolve the promise with the data
    conn.reader.resolve(data);
    conn.reader = null;
  });
  socket.on("end", () => {
    // this also fulfills the current read operation
    conn.ended = true;
    if (conn.reader) {
      conn.reader.resolve(Buffer.from(""));
      conn.reader = null;
    }
  });
  socket.on("error", (err: Error) => {
    // errors are also delivered to the current read
    conn.err = err;
    if (conn.reader) {
      conn.reader.reject(err);
      conn.reader = null;
    }
  });
  return conn;
}

/**
 * Handles a new TCP connection.
 *
 * @param {net.Socket} socket - The TCP socket for the new connection.
 * @returns {Promise<void>} - Completes when the client has been served and the connection is closed.
 */
async function newConn(socket: net.Socket): Promise<void> {
  console.log("New connection", socket.remoteAddress, socket.remotePort);
  try {
    await serveClient(socket);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    socket.destroy();
    console.log("Connection destroyed");
  }
}

/**
 * Serves a connected client by reading data and echoing it back.
 *
 * @param {net.Socket} socket - The TCP socket for the client.
 * @returns {Promise<void>} - Completes when the client disconnects.
 */
async function serveClient(socket: net.Socket): Promise<void> {
  const conn = soInit(socket);
  while (true) {
    const data = await soRead(conn);
    if (data.length === 0) {
      console.log("Connection closed by client");
      break;
    }

    console.log("data", data);
    // to enable backpressure, we need to wait for the write to complete before reading again
    // finite buffer are there hence
    await soWrite(conn, data);
  }
}

// Create a TCP server that listens on 127.0.0.1:8080.
// pauseOnConnect is set to true so that the socket is paused until the first read operation.
let server = net.createServer({
  pauseOnConnect: true,
});
server.listen({ host: "127.0.0.1", port: 8080 });
server.on("connection", newConn);
server.on("error", (err: Error) => {
  console.error("Server error:", err);
});
