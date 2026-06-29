import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

vi.mock("../lib/firebase", () => ({ getVerifiedUid: vi.fn() }));
vi.mock("../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));
vi.mock("../lib/cloudinary", () => ({
  uploadImage: vi.fn().mockResolvedValue("https://res.cloudinary.com/x/img.jpg"),
}));

import { getVerifiedUid } from "../lib/firebase";
import { prisma } from "../lib/prisma";
import { createApp } from "../app";

const LANDLORD = {
  id: "L1",
  role: "LANDLORD",
  firebaseUid: "fl",
  email: "l@x.com",
  name: "Landlord",
};
const TENANT = {
  id: "T1",
  role: "TENANT",
  firebaseUid: "ft",
  email: "t@x.com",
  name: "Tenant",
};

function asUser(u: typeof LANDLORD | typeof TENANT) {
  (getVerifiedUid as any).mockResolvedValue({ uid: u.firebaseUid, email: u.email });
  (prisma.user.findUnique as any).mockResolvedValue(u);
}

describe("upload routes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST /api/uploads - landlord with image → 201 + {url}", async () => {
    asUser(LANDLORD);

    const res = await request(createApp())
      .post("/api/uploads")
      .set("Authorization", "Bearer x")
      .attach("image", Buffer.from("x"), "x.png");

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ url: "https://res.cloudinary.com/x/img.jpg" });
  });

  it("POST /api/uploads - tenant → 403", async () => {
    asUser(TENANT);

    const res = await request(createApp())
      .post("/api/uploads")
      .set("Authorization", "Bearer x")
      .attach("image", Buffer.from("x"), "x.png");

    expect(res.status).toBe(403);
  });

  it("POST /api/uploads - no file → 400", async () => {
    asUser(LANDLORD);

    const res = await request(createApp())
      .post("/api/uploads")
      .set("Authorization", "Bearer x")
      .field("dummy", "value");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("POST /api/uploads - unauthenticated → 401", async () => {
    (getVerifiedUid as any).mockResolvedValue(null);

    const res = await request(createApp())
      .post("/api/uploads")
      .attach("image", Buffer.from("x"), "x.png");

    expect(res.status).toBe(401);
  });
});
