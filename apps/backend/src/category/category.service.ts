import { Injectable } from "@nestjs/common";
import { db } from "../db/connection";
import { categories } from "../db/schema";
import { eq } from "drizzle-orm";

@Injectable()
export class CategoryService {
  async findAll() {
    return db.select().from(categories).orderBy(categories.name);
  }

  async findById(id: string) {
    const result = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0] ?? null;
  }

  async create(data: { name: string; slug: string }) {
    const [category] = await db.insert(categories).values(data).returning();
    return category!;
  }

  async update(id: string, data: Partial<{ name: string; slug: string }>) {
    const [category] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return category ?? null;
  }

  async remove(id: string) {
    await db.delete(categories).where(eq(categories.id, id));
    return { ok: true };
  }
}
