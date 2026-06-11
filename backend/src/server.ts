import "dotenv/config";

import { app } from "./app.js";

const defaultPort = 3000;
const port = resolvePort(process.env.PORT);

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});

function resolvePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return defaultPort;
  }

  const parsedPort = Number(value);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
    console.warn(`Invalid PORT "${value}". Falling back to ${defaultPort}.`);
    return defaultPort;
  }

  return parsedPort;
}
