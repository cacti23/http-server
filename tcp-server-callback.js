import * as net from "net"; // all the networking stuff in in the net module

function newConn(socket) {
  console.log("new connection", socket.remoteAddress, socket.remotePort);
  socket.on("end", () => {
    // FIN received. The connection wil be closed automatically
    console.log("EOF.");
  });
  socket.on("data", (data) => {
    console.log("data:", data);
    socket.write(new Uint8Array(data)); // echo back the data or sends data back to the peer.
    // actively closed the connection if the data contains 'q'
    if (data.includes("q")) {
      console.log("closing.");
      socket.end(); // this will send FIN and close the connection.
    }
  });
}

let server = net.createServer(); // net.createServer() creates a listening socket whose type is net.Server
server.on("connection", newConn); // the callback function is called when a new connection is made
server.on("error", (err) => {
  throw err;
}); // the callback function is called when an error occurs

server.listen({ host: "127.0.0.1", port: 8080 }); // listen() method to bind and listen on an address

// Test Type	Command	Description
// Start Server	node index.js	Starts the TCP server
// Basic Connect	socat - TCP:127.0.0.1:8080	Opens interactive connection
// Send Message	echo "hello" | socat - TCP:127.0.0.1:8080	Sends single message and shows echo
// Graceful Close	echo "q" | socat - TCP:127.0.0.1:8080	Tests server's disconnect logic
// Interactive Mode	socat READLINE TCP:127.0.0.1:8080	Opens connection with command history