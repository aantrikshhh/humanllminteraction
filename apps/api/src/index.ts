import { createServer } from "node:http";

import { routeLeaderboardRequest } from "./leaderboard-handlers.js";
import { handlePaymentsRequest } from "./payments.js";

const port = Number(process.env.PORT ?? 4010);

const server = createServer(async (request, response) => {
  response.setHeader("content-type", "application/json; charset=utf-8");

  if (request.url === "/health") {
    response.writeHead(200);
    response.end(
      JSON.stringify({
        service: "@arena/api",
        status: "ok",
        routes: ["/leaderboard", "/leaderboard/players/:playerId", "/payments/*"],
      }),
    );
    return;
  }

  if (await routeLeaderboardRequest(request, response)) {
    return;
  }

  if (await handlePaymentsRequest(request, response)) {
    return;
  }

  response.writeHead(404);
  response.end(
    JSON.stringify({
      error: "not_found",
      service: "@arena/api",
    }),
  );
});

server.listen(port, () => {
  console.log(`@arena/api listening on http://localhost:${port}`);
});
