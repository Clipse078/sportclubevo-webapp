export type DressingRoomOccupancyActivityType = "TRAINING" | "MATCH" | "TOURNAMENT";

export type DressingRoomOccupancyMode = "DEFAULT" | "CUSTOM";

export type TenantDressingRoomOccupancyPresets = {
  training: { beforeMinutes: number; afterMinutes: number };
  match: { beforeMinutes: number; afterMinutes: number };
  tournament: { beforeMinutes: number; afterMinutes: number };
};

export type EventDressingRoomOccupancyOverride = {
  mode: DressingRoomOccupancyMode;
  beforeMinutes: number | null;
  afterMinutes: number | null;
};

export type ResolvedDressingRoomOccupancy = {
  mode: DressingRoomOccupancyMode;
  beforeMinutes: number;
  afterMinutes: number;
  effectiveStart: Date;
  effectiveEnd: Date;
};
