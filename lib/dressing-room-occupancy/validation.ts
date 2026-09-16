/** Upper bound for dressing-room buffer minutes (8 hours). */
export const MAX_DRESSING_ROOM_OCCUPANCY_MINUTES = 8 * 60;

export class DressingRoomOccupancyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DressingRoomOccupancyValidationError";
  }
}

export function validateDressingRoomOccupancyMinutes(
  value: unknown,
  label: string,
): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new DressingRoomOccupancyValidationError(`${label} must be an integer`);
  }
  if (value < 0) {
    throw new DressingRoomOccupancyValidationError(`${label} must be >= 0`);
  }
  if (value > MAX_DRESSING_ROOM_OCCUPANCY_MINUTES) {
    throw new DressingRoomOccupancyValidationError(
      `${label} must be <= ${MAX_DRESSING_ROOM_OCCUPANCY_MINUTES}`,
    );
  }
  return value;
}
