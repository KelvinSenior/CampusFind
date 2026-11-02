import 'dotenv/config';
import { app, prisma } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const server = app.listen(port, () => {
  console.log(`CampusFind API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await prisma.$disconnect();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
