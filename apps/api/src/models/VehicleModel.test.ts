import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { disconnectDB, resetDb } from "../../config/testDb.js";
import { VehicleMakeModel } from "./VehicleMake.js";
import { VehicleModelModel } from "./VehicleModel.js";

beforeAll(async () => {
  await resetDb();
  await VehicleModelModel.init();
});

afterAll(async () => {
  await disconnectDB();
});

describe("VehicleModelModel", () => {
  it("allows the same slug under two different makes but not twice under one", async () => {
    const saipa = await VehicleMakeModel.create({
      name: { fa: "سایپا", en: "Saipa" },
      slug: "saipa",
      country: "Iran",
      isDomestic: true,
    });
    const ikco = await VehicleMakeModel.create({
      name: { fa: "ایران خودرو", en: "Iran Khodro" },
      slug: "iran-khodro",
      country: "Iran",
      isDomestic: true,
    });

    await VehicleModelModel.create({
      makeId: saipa._id,
      name: { fa: "تیبا", en: "Tiba" },
      slug: "tiba",
      bodyType: "sedan",
    });

    // Same slug, different make — allowed.
    await expect(
      VehicleModelModel.create({
        makeId: ikco._id,
        name: { fa: "تیبا", en: "Tiba" },
        slug: "tiba",
        bodyType: "sedan",
      }),
    ).resolves.toBeDefined();

    // Same slug, same make — rejected.
    await expect(
      VehicleModelModel.create({
        makeId: saipa._id,
        name: { fa: "تیبا ۲", en: "Tiba 2" },
        slug: "tiba",
        bodyType: "hatchback",
      }),
    ).rejects.toThrow();
  });

  it("rejects an unknown bodyType", async () => {
    const make = await VehicleMakeModel.create({
      name: { fa: "x", en: "x" },
      slug: "make-for-bodytype-check",
      country: "Iran",
      isDomestic: true,
    });
    await expect(
      VehicleModelModel.create({
        makeId: make._id,
        name: { fa: "x", en: "x" },
        slug: "bad-bodytype",
        bodyType: "spaceship" as never,
      }),
    ).rejects.toThrow();
  });
});
