import "dotenv/config";
import { getApiConfig } from "./config.js";
import { createServer } from "./server.js";
import { seedDemoData } from "./seed.js";

const config = getApiConfig();
const server = await createServer(config);

if (process.env.DEMO_SEED === "true") {
  try {
    await server.db.$connect();
    await seedDemoData(server.db);
  } catch (error) {
    server.log.error({ error }, "Auto-seed failed, continuing anyway.");
  } finally {
    await server.db.$disconnect();
  }
}

try {
  await server.listen({ host: config.host, port: config.port });
} catch (error) {
  server.log.error(error);
  process.exit(1);
}
