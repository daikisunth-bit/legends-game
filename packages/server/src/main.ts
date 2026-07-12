import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { attachSocketServer } from "./realtime/socket-server.js";

const config = loadConfig();
const app = await buildApp(config);
attachSocketServer(app, config);
await app.listen({ host: config.HOST, port: config.PORT });
