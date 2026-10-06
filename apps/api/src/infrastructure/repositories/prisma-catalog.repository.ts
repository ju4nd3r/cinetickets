import { PrismaClient, FoodCategory } from '@prisma/client';
import { CatalogRepository } from '../../application/ports/index.js';
import { FoodItem, TicketType } from '@cinetickets/shared';

export class PrismaCatalogRepository implements CatalogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getFoodItems(category?: string): Promise<FoodItem[]> {
    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category as FoodCategory;
    }

    const items = await this.prisma.foodItem.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return items.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      category: f.category as 'combo' | 'popcorn' | 'drink' | 'candy',
      priceCents: f.priceCents,
      imageUrl: f.imageUrl,
      sizes: f.sizes.length > 0 ? f.sizes : undefined,
      available: f.available,
    }));
  }

  async getTicketTypes(): Promise<TicketType[]> {
    const types = await this.prisma.ticketType.findMany({
      orderBy: { discountPct: 'asc' },
    });

    return types.map((t) => ({
      id: t.id,
      label: t.label,
      discountPct: t.discountPct,
    }));
  }
}
