import { date, pgSchema, serial, varchar } from 'drizzle-orm/pg-core';

export const neonAuth = pgSchema('neon_auth');

export const task = neonAuth.table('task', {
    id: serial('id').primaryKey(),
    title: varchar('title'),
    description: varchar('description'),
    status: varchar('status'),
    priority: varchar('priority'),
    dueDate: date('due_date'),
    userId: serial('user_id')
})