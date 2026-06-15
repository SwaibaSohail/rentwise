import http from "node:http";
import { createApp } from "./app";
import { createSocketServer } from "./socket";
import { env } from "./config/env";

const app = createApp();
const server = http.createServer(app);
createSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`RentWise API listening on http://localhost:${env.PORT}`);
});
