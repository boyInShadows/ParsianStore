import type { BodyType, FuelType } from "@prisma/client";

export interface EngineSeed {
  code: string;
  displacement: number;
  fuel: FuelType;
  power: number;
}

export interface GenSeed {
  name: { fa: string; en: string };
  yearFrom: number;
  yearTo: number | null;
  facelift: boolean;
  engines: EngineSeed[];
}

export interface ModelSeed {
  name: { fa: string; en: string };
  slug: string;
  bodyType: BodyType;
  generations: GenSeed[];
}

export interface MakeSeed {
  name: { fa: string; en: string };
  slug: string;
  country: string;
  isDomestic: boolean;
  models: ModelSeed[];
}

// Sourced from English Wikipedia (per-model articles) and cross-checked
// against bne IntelliNews / carfolio / car.ir where noted in P2.S6's
// research pass — see the step's commit message for the full source
// list. Scope is locked to Saipa + Iran Khodro only (ADR 0004); every
// other domestic make and all imports are deliberately out of scope.
export const VEHICLE_SEED_DATA: MakeSeed[] = [
  {
    name: { fa: "سایپا", en: "Saipa" },
    slug: "saipa",
    country: "Iran",
    isDomestic: true,
    models: [
      {
        name: { fa: "پراید ۱۱۱", en: "Pride 111" },
        slug: "pride-111",
        bodyType: "hatchback",
        generations: [
          {
            name: { fa: "فیس‌لیفت پراید هاچبک", en: "Pride hatchback facelift" },
            yearFrom: 2010,
            yearTo: 2020,
            facelift: true,
            engines: [{ code: "1.3L SOHC", displacement: 1.3, fuel: "petrol", power: 65 }],
          },
        ],
      },
      {
        name: { fa: "پراید ۱۳۱", en: "Pride 131" },
        slug: "pride-131",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2007,
            yearTo: 2020,
            facelift: false,
            engines: [{ code: "1.3L SOHC", displacement: 1.3, fuel: "petrol", power: 65 }],
          },
        ],
      },
      {
        name: { fa: "پراید ۱۳۲", en: "Pride 132" },
        slug: "pride-132",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2007,
            yearTo: 2020,
            facelift: false,
            engines: [{ code: "1.3L SOHC", displacement: 1.3, fuel: "petrol", power: 65 }],
          },
        ],
      },
      {
        name: { fa: "پراید ۱۴۱", en: "Pride 141" },
        slug: "pride-141",
        bodyType: "liftback",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2001,
            yearTo: 2020,
            facelift: false,
            engines: [{ code: "1.3L SOHC", displacement: 1.3, fuel: "petrol", power: 65 }],
          },
        ],
      },
      {
        name: { fa: "پراید ۱۵۱", en: "Pride 151" },
        slug: "pride-151",
        bodyType: "pickup",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2011,
            yearTo: null,
            facelift: false,
            engines: [{ code: "1.324L SOHC", displacement: 1.324, fuel: "petrol", power: 65 }],
          },
        ],
      },
      {
        name: { fa: "تیبا", en: "Tiba" },
        slug: "tiba",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2009,
            yearTo: 2022,
            facelift: false,
            engines: [{ code: "M15", displacement: 1.5, fuel: "petrol", power: 87 }],
          },
        ],
      },
      {
        name: { fa: "تیبا ۲", en: "Tiba 2" },
        slug: "tiba-2",
        bodyType: "hatchback",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2013,
            yearTo: 2022,
            facelift: false,
            engines: [{ code: "M15", displacement: 1.5, fuel: "petrol", power: 87 }],
          },
        ],
      },
      {
        name: { fa: "ساینا", en: "Saina" },
        slug: "saina",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2016,
            yearTo: 2020,
            facelift: false,
            engines: [{ code: "M15", displacement: 1.5, fuel: "petrol", power: 87 }],
          },
          {
            name: { fa: "فیس‌لیفت", en: "Facelift" },
            yearFrom: 2020,
            yearTo: null,
            facelift: true,
            engines: [{ code: "M15", displacement: 1.5, fuel: "petrol", power: 87 }],
          },
        ],
      },
      {
        name: { fa: "کوییک", en: "Quick" },
        slug: "quick",
        bodyType: "hatchback",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2018,
            yearTo: null,
            facelift: false,
            engines: [{ code: "M15", displacement: 1.5, fuel: "petrol", power: 87 }],
          },
        ],
      },
      {
        name: { fa: "شاهین", en: "Shahin" },
        slug: "shahin",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2020,
            yearTo: 2023,
            facelift: false,
            engines: [{ code: "M15TC", displacement: 1.5, fuel: "petrol", power: 110 }],
          },
          {
            name: { fa: "شاهین پلاس", en: "Shahin Plus" },
            yearFrom: 2023,
            yearTo: null,
            facelift: true,
            engines: [{ code: "ME16", displacement: 1.6, fuel: "petrol", power: 115 }],
          },
        ],
      },
      {
        name: { fa: "اطلس", en: "Atlas" },
        slug: "atlas",
        bodyType: "crossover",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2023,
            yearTo: null,
            facelift: false,
            engines: [{ code: "M15I", displacement: 1.5, fuel: "petrol", power: 90 }],
          },
        ],
      },
      {
        name: { fa: "آریا", en: "Aria" },
        slug: "aria",
        bodyType: "crossover",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2023,
            yearTo: null,
            facelift: false,
            engines: [
              { code: "ME16", displacement: 1.6, fuel: "petrol", power: 115 },
              { code: "4J20V", displacement: 2.0, fuel: "petrol", power: 150 },
            ],
          },
        ],
      },
    ],
  },
  {
    name: { fa: "ایران خودرو", en: "Iran Khodro" },
    slug: "iran-khodro",
    country: "Iran",
    isDomestic: true,
    models: [
      {
        name: { fa: "سمند", en: "Samand" },
        slug: "samand",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2001,
            yearTo: 2009,
            facelift: false,
            engines: [
              { code: "XU7JP", displacement: 1.8, fuel: "petrol", power: 100 },
              { code: "EF7", displacement: 1.7, fuel: "petrol", power: 113 },
            ],
          },
          {
            name: { fa: "سمند ال‌ایکس", en: "Samand LX" },
            yearFrom: 2009,
            yearTo: 2022,
            facelift: true,
            engines: [
              { code: "EF7", displacement: 1.7, fuel: "petrol", power: 113 },
              { code: "EF7 CNG", displacement: 1.7, fuel: "cng", power: 113 },
            ],
          },
        ],
      },
      {
        name: { fa: "سمند سورن", en: "Samand Soren" },
        slug: "samand-soren",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2007,
            yearTo: 2019,
            facelift: false,
            engines: [
              { code: "XU7JP", displacement: 1.8, fuel: "petrol", power: 100 },
              { code: "EF7", displacement: 1.7, fuel: "petrol", power: 113 },
            ],
          },
          {
            name: { fa: "سورن پلاس", en: "Soren Plus" },
            yearFrom: 2020,
            yearTo: null,
            facelift: true,
            engines: [{ code: "EF7", displacement: 1.7, fuel: "petrol", power: 113 }],
          },
        ],
      },
      {
        name: { fa: "دنا", en: "Dena" },
        slug: "dena",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2015,
            yearTo: 2021,
            facelift: false,
            engines: [{ code: "EF7", displacement: 1.648, fuel: "petrol", power: 113 }],
          },
          {
            name: { fa: "دنا پلاس", en: "Dena Plus" },
            yearFrom: 2017,
            yearTo: null,
            facelift: true,
            engines: [
              { code: "EF7 TC", displacement: 1.648, fuel: "petrol", power: 138 },
              { code: "EFP", displacement: 1.7, fuel: "petrol", power: 163 },
            ],
          },
        ],
      },
      {
        name: { fa: "رانا", en: "Runna" },
        slug: "runna",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2010,
            yearTo: 2020,
            facelift: false,
            engines: [{ code: "TU5JP4", displacement: 1.6, fuel: "petrol", power: 105 }],
          },
          {
            name: { fa: "رانا پلاس", en: "Runna Plus" },
            yearFrom: 2020,
            yearTo: null,
            facelift: true,
            engines: [{ code: "TU5JP4", displacement: 1.6, fuel: "petrol", power: 109 }],
          },
        ],
      },
      {
        name: { fa: "تارا", en: "Tara" },
        slug: "tara",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2021,
            yearTo: null,
            facelift: false,
            engines: [
              { code: "TU5P", displacement: 1.6, fuel: "petrol", power: 106 },
              { code: "EFP TC", displacement: 1.7, fuel: "petrol", power: 163 },
            ],
          },
        ],
      },
      {
        name: { fa: "آریسان", en: "Arisun" },
        slug: "arisun",
        bodyType: "pickup",
        generations: [
          {
            name: { fa: "آریسان ۱", en: "Arisun 1" },
            yearFrom: 2015,
            yearTo: 2022,
            facelift: false,
            engines: [{ code: "OHVG2", displacement: 1.7, fuel: "petrol", power: 82 }],
          },
          {
            name: { fa: "آریسان ۲", en: "Arisun 2" },
            yearFrom: 2022,
            yearTo: null,
            facelift: true,
            engines: [{ code: "XU7", displacement: 1.8, fuel: "petrol", power: 100 }],
          },
        ],
      },
      {
        name: { fa: "پژو ۴۰۵", en: "Peugeot 405" },
        slug: "peugeot-405",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 1992,
            yearTo: 2022,
            facelift: false,
            engines: [
              { code: "XU7", displacement: 1.8, fuel: "petrol", power: 100 },
              { code: "TU5", displacement: 1.6, fuel: "petrol", power: 109 },
            ],
          },
        ],
      },
      {
        name: { fa: "پژو پارس", en: "Peugeot Pars" },
        slug: "peugeot-pars",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2000,
            yearTo: 2024,
            facelift: false,
            engines: [
              { code: "XU7 L3", displacement: 1.8, fuel: "petrol", power: 100 },
              { code: "TU5JP4", displacement: 1.6, fuel: "petrol", power: 109 },
              { code: "XU7 JP4", displacement: 1.8, fuel: "petrol", power: 110 },
            ],
          },
        ],
      },
      {
        name: { fa: "پژو ۲۰۶", en: "Peugeot 206" },
        slug: "peugeot-206",
        bodyType: "hatchback",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2001,
            yearTo: 2024,
            facelift: false,
            engines: [
              { code: "TU3JP", displacement: 1.4, fuel: "petrol", power: 75 },
              { code: "TU5JP4", displacement: 1.6, fuel: "petrol", power: 110 },
            ],
          },
        ],
      },
      {
        name: { fa: "پژو ۲۰۶ اس‌دی", en: "Peugeot 206 SD" },
        slug: "peugeot-206-sd",
        bodyType: "sedan",
        generations: [
          {
            name: { fa: "پایه", en: "Base" },
            yearFrom: 2005,
            yearTo: 2024,
            facelift: false,
            engines: [{ code: "TU5JP4", displacement: 1.6, fuel: "petrol", power: 110 }],
          },
        ],
      },
      {
        name: { fa: "پژو ۲۰۷ آی", en: "Peugeot 207i" },
        slug: "peugeot-207i",
        bodyType: "hatchback",
        generations: [
          {
            name: { fa: "نسل اول (دنده‌ای)", en: "First generation (manual)" },
            yearFrom: 2010,
            yearTo: 2012,
            facelift: false,
            engines: [{ code: "TU5", displacement: 1.6, fuel: "petrol", power: 105 }],
          },
          {
            name: { fa: "نسل دوم (اتوماتیک)", en: "Second generation (automatic)" },
            yearFrom: 2016,
            yearTo: null,
            facelift: true,
            engines: [{ code: "TU5", displacement: 1.6, fuel: "petrol", power: 113 }],
          },
        ],
      },
    ],
  },
];
