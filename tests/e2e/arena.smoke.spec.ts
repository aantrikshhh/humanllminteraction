import { expect, test, type APIRequestContext } from "@playwright/test";

import type { PublicRoomState } from "@arena/contracts";

const roomsBaseUrl = process.env.ROOMS_BASE_URL ?? "http://127.0.0.1:4011";

const demoAuctionRoomPayload = {
  game: "auction",
  phase: "active",
  seats: [
    {
      displayName: "Seat 1",
      avatarId: "mask-amber",
      backingType: "human",
      playerId: "smoke-player",
    },
    {
      displayName: "Seat 2",
      avatarId: "mask-cyan",
      backingType: "llm",
      llmModelId: "smoke-auction-fake-1",
      promptVersionId: "auction-fake-v1",
    },
    {
      displayName: "Seat 3",
      avatarId: "mask-rose",
      backingType: "llm",
      llmModelId: "smoke-auction-fake-2",
      promptVersionId: "auction-fake-v1",
    },
    {
      displayName: "Seat 4",
      avatarId: "mask-verdant",
      backingType: "llm",
      llmModelId: "smoke-auction-fake-3",
      promptVersionId: "auction-fake-v1",
    },
  ],
} as const;

test.describe("ARENA smoke", () => {
  test("lobby creates a demo auction room and opens the live room shell", async ({ page }) => {
    await page.goto("/lobby");

    await expect(page.getByRole("heading", { name: "Active Rooms" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create demo auction room" }),
    ).toBeVisible();

    const createRoomResponse = page.waitForResponse((response) => {
      return response.url().endsWith("/api/rooms") && response.request().method() === "POST";
    });

    await page.getByRole("button", { name: "Create demo auction room" }).click();

    const createResponse = await createRoomResponse;
    expect(createResponse.ok()).toBeTruthy();

    const createdRoom = (await createResponse.json()) as PublicRoomState;
    const roomHref = `/rooms/${createdRoom.roomId}`;
    const liveRoomLink = page.locator(`a[href="${roomHref}"]`).first();
    await expect(liveRoomLink).toBeVisible();
    await liveRoomLink.click();

    await expect(page).toHaveURL(/\/rooms\/[^/]+$/);
    await expect(page.getByRole("heading", { name: "Operator seat" })).toBeVisible();
    await expect(page.getByText("Seats blinded")).toBeVisible();
    await expect(page.getByText("Room telemetry")).toBeVisible();

    const bidButton = page.getByRole("button", { name: /^Bid \d+$/ }).first();
    await expect(bidButton).toBeEnabled();

    const messageResponse = page.waitForResponse((response) => {
      return (
        response.url().includes("/api/rooms/") &&
        response.url().includes("/messages") &&
        response.request().method() === "POST"
      );
    });

    await bidButton.click();

    const response = await messageResponse;
    expect(response.ok()).toBeTruthy();

    await expect(page.getByText("Current bid")).toBeVisible();
    await expect(page.getByRole("link", { name: "Lobby" })).toBeVisible();
  });

  test("results page renders a completed live room", async ({ page, request }) => {
    const room = await createAuctionRoom(request);

    await advanceAuctionRoomToResults(request, room.roomId);
    await page.goto(`/results/${room.roomId}`);

    await expect(page.getByRole("heading", { name: /room complete/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Final standings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Replay availability" })).toBeVisible();
    await expect(page.getByText("Seat-blinded")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open replay JSON" })).toBeVisible();
    await expect(page.getByText("room winner")).toBeVisible();
  });
});

async function createAuctionRoom(request: APIRequestContext): Promise<PublicRoomState> {
  const response = await request.post(`${roomsBaseUrl}/rooms/bootstrap`, {
    data: demoAuctionRoomPayload,
  });

  expect(response.ok()).toBeTruthy();
  return (await response.json()) as PublicRoomState;
}

async function getRoom(
  request: APIRequestContext,
  roomId: string,
): Promise<PublicRoomState> {
  const response = await request.get(`${roomsBaseUrl}/rooms/${roomId}`);
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as PublicRoomState;
}

async function advanceAuctionRoomToResults(
  request: APIRequestContext,
  roomId: string,
): Promise<void> {
  for (let guard = 0; guard < 20; guard += 1) {
    const room = await getRoom(request, roomId);

    if (room.phase === "results") {
      return;
    }

    const currentTurnSeatId =
      typeof room.publicState === "object" && room.publicState !== null
        ? "currentTurnSeatId" in room.publicState
          ? room.publicState.currentTurnSeatId
          : undefined
        : undefined;

    if (currentTurnSeatId !== "seat_1") {
      await pageTick(request);
      continue;
    }

    const response = await request.post(`${roomsBaseUrl}/rooms/${roomId}/messages`, {
      data: {
        type: "room.action",
        seatId: "seat_1",
        payload: {
          type: "auction.pass",
        },
      },
    });

    expect(response.ok()).toBeTruthy();
  }

  throw new Error(`room ${roomId} did not reach results within the smoke guard limit`);
}

async function pageTick(request: APIRequestContext): Promise<void> {
  await request.get(`${roomsBaseUrl}/health`);
  await new Promise((resolve) => setTimeout(resolve, 150));
}
