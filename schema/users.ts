import { boolean, date, integer, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-orm/zod";
import z from "zod";

// Mapped to the existing `public.user` table in Neon. Column names, types and
// lengths mirror the live schema so queries resolve against real columns.
export const users = pgTable('user', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    firstName: varchar('first_name', { length: 100000 }),
    email: varchar('email', { length: 100000 }),
    lastName: varchar('last_name', { length: 10000 }),
    mobileNumber: varchar('mobile_number', { length: 1000 }),
    password: text('password'),
    createdBy: varchar('created_by', { length: 100000 }),
    updatedBy: varchar('updated_by', { length: 100000 }),
    createdAt: date('created_at'),
    updatedAt: date('updated_at'),
    isActive: boolean('is_active'),
});

const phoneRegex = /^\+?[1-9]\d{1,14}$/;

export const selectUserSchema = createSelectSchema(users, {
  email: schema => schema.email().regex(/^([\w.+%-]+@[a-z0-9.-]+\.[a-z]{2,6})$/i),
  mobileNumber: schema => schema
    .regex(phoneRegex, 'Invalid phone number format. Use international format (e.g., +1234567890)')
    .optional(),
});

export const loginResponseSchema = selectUserSchema.pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
}).extend({
  role: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});