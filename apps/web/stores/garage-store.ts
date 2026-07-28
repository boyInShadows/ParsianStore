import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { buildVehicleKey, type VehicleKeyParts } from "schemas";
import { getCookie, removeCookie, setCookie } from "@/lib/cookie";

// masterPlan.md §3.2/§3.4: the Garage stores the same
// {makeId,modelId,genId,engineId?,year} VehicleKeyParts used everywhere
// else (buildVehicleKey/parseVehicleKey, packages/schemas), plus a
// display label snapshotted at save time -- reconstructing "پراید ۱۳۱"
// from just IDs would need another API round trip every time the chip
// renders.
export type GarageVehicle = VehicleKeyParts & {
  label: string;
};

type GarageState = {
  vehicles: GarageVehicle[];
  activeKey: string | null;
  addVehicle: (vehicle: GarageVehicle) => void;
  removeVehicle: (key: string) => void;
  setActive: (key: string | null) => void;
};

const COOKIE_NAME = "ps_garage";

// masterPlan.md §3.4: "Guests get a garage too — stored in a cookie,
// merged into the account on login." A cookie (not localStorage) is the
// deliberate choice: it's what a future server-side merge-on-login step
// (and any SSR fitment filtering) can read that localStorage cannot.
const cookieStorage: StateStorage = {
  getItem: (name) => getCookie(name) ?? null,
  setItem: (name, value) => setCookie(name, value),
  removeItem: (name) => removeCookie(name),
};

export const useGarageStore = create<GarageState>()(
  persist(
    (set) => ({
      vehicles: [],
      activeKey: null,
      addVehicle: (vehicle) => {
        const key = buildVehicleKey(vehicle);
        set((state) => ({
          vehicles: [...state.vehicles.filter((v) => buildVehicleKey(v) !== key), vehicle],
          activeKey: key,
        }));
      },
      removeVehicle: (key) =>
        set((state) => ({
          vehicles: state.vehicles.filter((v) => buildVehicleKey(v) !== key),
          activeKey: state.activeKey === key ? null : state.activeKey,
        })),
      setActive: (key) => set({ activeKey: key }),
    }),
    { name: COOKIE_NAME, storage: createJSONStorage(() => cookieStorage) },
  ),
);

export function selectActiveVehicle(state: GarageState): GarageVehicle | null {
  return state.vehicles.find((v) => buildVehicleKey(v) === state.activeKey) ?? null;
}
