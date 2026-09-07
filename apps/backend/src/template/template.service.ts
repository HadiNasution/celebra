import { BadRequestException, Injectable } from "@nestjs/common";
import { db } from "../db/connection";
import { templates } from "../db/schema";
import { eq, and } from "drizzle-orm";

@Injectable()
export class TemplateService {
  async findAll(categoryId?: string) {
    const conditions = [eq(templates.isActive, true)];
    if (categoryId) {
      conditions.push(eq(templates.categoryId, categoryId));
    }
    return db.select().from(templates).where(and(...conditions)).orderBy(templates.name);
  }

  async findAllAdmin(categoryId?: string) {
    const conditions = [];
    if (categoryId) {
      conditions.push(eq(templates.categoryId, categoryId));
    }
    if (conditions.length > 0) {
      return db.select().from(templates).where(and(...conditions)).orderBy(templates.name);
    }
    return db.select().from(templates).orderBy(templates.name);
  }

  async findById(id: string) {
    const result = await db.select().from(templates).where(eq(templates.id, id)).limit(1);
    return result[0] ?? null;
  }

  async create(data: {
    name: string;
    categoryId: string;
    htmlBundle: string;
    cssBundle?: string;
    jsBundle?: string;
    jsonSchema: Record<string, unknown>;
    previewImage?: string;
    isPremium?: boolean;
  }) {
    if (this.hasSuspiciousScript(data.htmlBundle)) {
      throw new BadRequestException(
        "Template contains disallowed scripts (eval, document.write)",
      );
    }

    const [template] = await db
      .insert(templates)
      .values({
        name: data.name,
        categoryId: data.categoryId,
        htmlBundle: data.htmlBundle,
        cssBundle: data.cssBundle ?? null,
        jsBundle: data.jsBundle ?? null,
        jsonSchema: data.jsonSchema,
        previewImage: data.previewImage ?? null,
        isPremium: data.isPremium ?? false,
      })
      .returning();
    return template!;
  }

  async update(id: string, data: Partial<{
    name: string;
    isActive: boolean;
    isPremium: boolean;
  }>) {
    const [template] = await db
      .update(templates)
      .set(data)
      .where(eq(templates.id, id))
      .returning();
    return template ?? null;
  }

  async remove(id: string) {
    await db.update(templates).set({ isActive: false }).where(eq(templates.id, id));
    return { ok: true };
  }

  private hasSuspiciousScript(html: string): boolean {
    return /\beval\b/.test(html) || /\bdocument\.write\b/.test(html);
  }
}
