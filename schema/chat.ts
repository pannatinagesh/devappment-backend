import { index, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

// One row per message. `role` follows Gemini's convention: 'user' or 'model'.
// Every row belongs to exactly one user, so each user has a private conversation.
export const chatMessage = pgTable('chat_message', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 10 }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, table => [
    index('chat_message_user_id_id_idx').on(table.userId, table.id),
]);
