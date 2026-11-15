import { eq, sql } from "drizzle-orm";
import { db } from "../config/db.jsx";
import { users } from "@/schema/users.js";

type AddUserInput = {
    email: string;
    password: string;
    first_name?: string | null;
    last_name?: string | null;
    mobile_number?: string | null;
};

export const addUser = async ({ email, password, first_name, last_name, mobile_number }: AddUserInput) => {
    const [user] = await db.insert(users).values({
        email,
        password,
        firstName: first_name ?? null,
        lastName: last_name ?? null,
        mobileNumber: mobile_number ?? null,
        isActive: true,
    }).returning({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        mobileNumber: users.mobileNumber,
        isActive: users.isActive,
    });
    return user;
};

export const getUserByEmail = async (email: string) => {
    const [user] = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
    return user;
};

export const getAllUsersFromDB = async () => {
    const rows = await db.execute(sql`SELECT first_name, last_name, email FROM "user"`);
    return rows;
};

export const postUsersFromDB = async ({ user_name, user_email }: { user_name: string; user_email: string }) => {
    const rows = await db.execute(
        sql`INSERT INTO "user" (user_name, user_email)
            VALUES (${user_name}, ${user_email})
            RETURNING *`
    );
    return rows[0];
};

export const putUsersFromDB = async ({ id, user_name, user_email }: { id: number; user_name: string; user_email: string }) => {
    const rows = await db.execute(
        sql`UPDATE "user" SET user_name = ${user_name}, user_email = ${user_email} WHERE id = ${id} RETURNING *`
    );
    return rows[0];
};

export const getAllUserDataByEmail = async (email: string) => {
    const [user] = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        password: users.password,
        mobileNumber: users.mobileNumber,
        isActive: users.isActive
    }).from(users).where(eq(users.email, email)).limit(1);
    return user;
}