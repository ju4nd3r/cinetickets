import type Redis from 'ioredis';
import { SeatHoldStore } from '../application/ports/index.js';
import { SeatUnavailableError } from '../domain/errors.js';

export class RedisSeatHoldStore implements SeatHoldStore {
  constructor(private readonly redis: Redis) {}

  private getSeatKey(showtimeId: string, seatId: string): string {
    return `hold:seat:${showtimeId}:${seatId}`;
  }

  private getHoldMetaKey(holdId: string): string {
    return `hold:meta:${holdId}`;
  }

  async holdSeats(
    showtimeId: string,
    seatIds: string[],
    ttlSeconds: number,
  ): Promise<{ holdId: string; expiresAt: Date }> {
    const holdId = `hld_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
    const acquiredSeatKeys: string[] = [];

    // Intentar adquirir cada asiento atómicamente con SET NX EX
    for (const seatId of seatIds) {
      const key = this.getSeatKey(showtimeId, seatId);
      const res = await this.redis.set(key, holdId, 'EX', ttlSeconds, 'NX');

      if (res !== 'OK') {
        // Conflicto de concurrencia: liberar inmediatamente los que hayamos alcanzado a reservar
        if (acquiredSeatKeys.length > 0) {
          await this.redis.del(...acquiredSeatKeys);
        }
        throw new SeatUnavailableError(`El asiento '${seatId}' ya se encuentra reservado`, {
          seatId,
          showtimeId,
        });
      }

      acquiredSeatKeys.push(key);
    }

    // Guardar metadatos del hold
    const metaKey = this.getHoldMetaKey(holdId);
    const metaPayload = JSON.stringify({
      holdId,
      showtimeId,
      seatIds,
      createdAt: new Date().toISOString(),
    });
    await this.redis.set(metaKey, metaPayload, 'EX', ttlSeconds);

    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    return { holdId, expiresAt };
  }

  async verifyHold(showtimeId: string, holdId: string, seatIds: string[]): Promise<boolean> {
    const metaKey = this.getHoldMetaKey(holdId);
    const metaRaw = await this.redis.get(metaKey);
    if (!metaRaw) return false;

    for (const seatId of seatIds) {
      const seatKey = this.getSeatKey(showtimeId, seatId);
      const val = await this.redis.get(seatKey);
      if (val !== holdId) {
        return false;
      }
    }

    return true;
  }

  async releaseHold(holdId: string): Promise<void> {
    const metaKey = this.getHoldMetaKey(holdId);
    const metaRaw = await this.redis.get(metaKey);
    if (!metaRaw) return;

    try {
      const parsed = JSON.parse(metaRaw) as { showtimeId: string; seatIds: string[] };
      const keysToDelete = [metaKey];
      for (const seatId of parsed.seatIds) {
        keysToDelete.push(this.getSeatKey(parsed.showtimeId, seatId));
      }
      await this.redis.del(...keysToDelete);
    } catch {
      await this.redis.del(metaKey);
    }
  }

  async getHeldSeatIds(showtimeId: string): Promise<string[]> {
    const pattern = `hold:seat:${showtimeId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length === 0) return [];

    const prefix = `hold:seat:${showtimeId}:`;
    return keys.map((k) => k.replace(prefix, ''));
  }
}
