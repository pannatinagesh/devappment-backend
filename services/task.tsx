import { and, eq, ilike, or } from "drizzle-orm";
import type { Request } from "express";
import { db } from "../config/db.jsx";
import { task } from "../schema/task.js";

export const getAllTaskFromDB = async (userId: number) => {
    const rows = await db.select().from(task).where(eq(task.userId, userId))
    return rows;
};

export type TaskFilters = {
    status?: string;
    priority?: string;
    description?: string;
    title?: string;
    searchQuery?: string;
};

export const getTasksByFiltersFromDB = async (userId: number, filters: TaskFilters = {}) => {
    const { status, priority, description, title, searchQuery } = filters;
    const conditions = [eq(task.userId, userId)];
    if (status) conditions.push(ilike(task.status, status));
    if (priority) conditions.push(ilike(task.priority, priority));
    if (description) conditions.push(ilike(task.description, `%${description}%`));
    if (title) conditions.push(ilike(task.title, `%${title}%`));
    if (searchQuery) {
        const like = `%${searchQuery}%`;
        conditions.push(or(ilike(task.title, like), ilike(task.description, like))!);
    }
    return db.select().from(task).where(and(...conditions)).limit(50);
};

export const getByIdtaskFromDB = async (id: string | string[] | undefined, userId: number) => {
    const taskId = Number(Array.isArray(id) ? id[0] : id);
    const rows = await db.select({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        userId: task.userId
    }).from(task).where(and(eq(task.id, taskId), eq(task.userId, userId))).limit(1)
    return rows[0];
};

export const postTaskFromDB = async (req: Request, userId: number) => {
    const { title, description, status, priority, dueDate } = req?.body || {};
    const rows = await db.insert(task).values({
        title,
        description,
        status,
        priority,
        dueDate,
        userId
    }).returning();
    return rows[0];
};
