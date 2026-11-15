import { addUser, getAllUserDataByEmail, getUserByEmail, putUsersFromDB } from '../services/user.jsx';
import { getAllUsersFromDB, postUsersFromDB } from '../services/user.jsx';
import { z } from "zod";
import type { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import { generateAccessToken, generateRefreshToken, pickSessionClaims, verifyRefreshToken, type JWTObject } from '@/utils/jwt.js';
import { setAuthCookies } from '@/utils/auth-cookies.js';
import { loginResponseSchema } from '@/schema/users.js';

export const createUserSchema = z.object({
    user_name: z
        .string()
        .trim()
        .min(2, "Name must contain at least 2 characters")
        .max(100, "Name cannot exceed 100 characters"),

    user_email: z
        .email("Please enter a valid email address")
        .transform((email) => email.toLowerCase()),

});

export type HttpErrorCode =
    | 'BAD_REQUEST'
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'FORBIDDEN'
    | 'METHOD_NOT_ALLOWED'
    | 'NOT_ACCEPTABLE'
    | 'REQUEST_TIMEOUT'
    | 'CONFLICT'
    | 'GONE'
    | 'LENGTH_REQUIRED'
    | 'PRECONDITION_FAILED'
    | 'PAYLOAD_TOO_LARGE'
    | 'URI_TOO_LONG'
    | 'UNSUPPORTED_MEDIA_TYPE'
    | 'RANGE_NOT_SATISFIABLE'
    | 'EXPECTATION_FAILED'
    | 'TEAPOT'
    | 'URL_NOT_FOUND';

export type BackendErrorCode = 'VALIDATION_ERROR' | 'USER_NOT_FOUND' | 'INVALID_PASSWORD';

export const VALIDATION_ERROR: string = 'VALIDATION_ERROR';
export type ErrorCode = HttpErrorCode | BackendErrorCode | 'INTERNAL_ERROR';

export class BackendError extends Error {
    code: ErrorCode;
    details?: unknown;
    constructor(
        code: ErrorCode,
        {
            message,
            details,
        }: {
            message?: string;
            details?: unknown;
        } = {},
    ) {
        super(message ?? getMessageFromErrorCode(code));
        this.code = code;
        this.details = details;
    }
}

export function getMessageFromErrorCode(code: ErrorCode): string {
    switch (code) {
        case 'BAD_REQUEST':
            return 'The request is invalid.';
        case VALIDATION_ERROR:
            return 'The request contains invalid or missing fields.';
        case 'UNAUTHORIZED':
            return 'You are not authorized to access this resource.';
        case 'NOT_FOUND':
            return 'The requested resource was not found.';
        case 'USER_NOT_FOUND':
            return 'The user was not found.';
        case 'INTERNAL_ERROR':
            return 'An internal server error occurred.';
        case 'CONFLICT':
            return 'The request conflicts with the current state of the server.';
        case 'INVALID_PASSWORD':
            return 'The password is incorrect.';
        default:
            return 'An internal server error occurred.';
    }
}

export function getStatusFromErrorCode(code: ErrorCode): number {
    switch (code) {
        case 'BAD_REQUEST':
        case VALIDATION_ERROR:
        case 'VALIDATION_ERROR':
            return 400;
        case 'UNAUTHORIZED':
        case 'INVALID_PASSWORD':
            return 401;
        case 'FORBIDDEN':
            return 403;
        case 'NOT_FOUND':
        case 'USER_NOT_FOUND':
            return 404;
        case 'CONFLICT':
            return 409;
        default:
            return 500;
    }
}

export const signupSchema = z.object({
    email: z
        .email("Please enter a valid email address")
        .transform((email) => email.toLowerCase()),
    password: z.string().min(1, "Password is required"),
    first_name: z
        .string()
        .trim()
        .max(50, "First name cannot exceed 50 characters")
        .optional(),
    last_name: z
        .string()
        .trim()
        .max(50, "Last name cannot exceed 50 characters")
        .optional(),
    mobile_number: z.string().trim().optional()
});

export const signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const parsed = signupSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({
                status: false,
                message: "Validation failed",
                errors: z.flattenError(parsed.error),
            });
        }

        const { email, password, first_name, last_name, mobile_number } = parsed.data;

        const existing = await getUserByEmail(email);
        if (existing) {
            throw new BackendError('CONFLICT' as ErrorCode, {
                message: 'A user with this email already exists',
            });
        }

        // Client sends the password in plaintext; hash it directly so signin can
        // verify the plaintext against this argon2id hash.
        const hashedPassword = await argon2.hash(password);

        const user = await addUser({
            email,
            password: hashedPassword,
            mobile_number,
            first_name,
            last_name,
        });

        return res.status(201).json({
            status: true,
            message: 'User registered successfully',
            data: user,
        });
    } catch (err) {
        if (err instanceof BackendError) {
            return res.status(getStatusFromErrorCode(err.code)).json({
                status: false,
                message: err.message,
                code: err.code,
            });
        }
        console.error('signup failed:', err);
        res.status(500).json({ status: false, message: 'Database query failed' });
        next(err);
    }
};

export const signin = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { password } = req?.body;
        const email = (req.body.email as string)
        const user = await getAllUserDataByEmail(email as string);
        // const userAgent = req.headers['user-agent'] ?? '';

        if (!user?.password)
            throw new BackendError(VALIDATION_ERROR as ErrorCode);
        if (!password) {
            throw new BackendError(VALIDATION_ERROR as ErrorCode);
        }

        // argon2.verify signature is (hash, plainPassword).
        const matchPassword = await argon2.verify(user.password, password);

        if (!matchPassword)
            throw new BackendError('INVALID_PASSWORD' as ErrorCode);
        if (user.isActive === false) {
            throw new BackendError('UNAUTHORIZED' as ErrorCode, {
                message: 'Invalid username or password',
            });
        }
        let tokenObject: JWTObject = { userId: String(user.id), actorType: 'USER' };

        const accessToken = generateAccessToken(tokenObject);
        const refreshToken = generateRefreshToken(tokenObject);

        setAuthCookies(res, accessToken, refreshToken);
        const role = 'User'

        const loginResponse = {
            ...loginResponseSchema.parse(user),
            role,
        };
        res.status(200).json({ status: true, message: 'Logged in successfully', data: loginResponse });
    } catch (err) {
        if (err instanceof BackendError) {
            return res.status(getStatusFromErrorCode(err.code)).json({
                status: false,
                message: err.message,
                code: err.code,
            });
        }
        console.error('signin failed:', err);
        res.status(500).json({ status: false, message: 'Database query failed' });
        next(err);
    }
}

/**
 * Issues a fresh access token (and rotates the refresh token) from a valid refresh
 * token. The refresh token is read from the refreshToken cookie, or the request body
 * as a fallback. Responds 401 when it is missing, expired, or invalid.
 */
export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token: unknown = req.cookies?.refreshToken ?? req.body?.refreshToken;
        if (typeof token !== 'string' || token.length === 0) {
            throw new BackendError('UNAUTHORIZED' as ErrorCode, {
                message: 'Refresh token is required',
            });
        }

        const decoded = verifyRefreshToken(token);
        const claims = pickSessionClaims(decoded);

        const accessToken = generateAccessToken(claims);
        const newRefreshToken = generateRefreshToken(claims);

        setAuthCookies(res, accessToken, newRefreshToken);

        return res.status(200).json({
            status: true,
            message: 'Token refreshed successfully',
        });
    } catch (err) {
        if (err instanceof BackendError) {
            return res.status(getStatusFromErrorCode(err.code)).json({
                status: false,
                message: err.message,
                code: err.code,
            });
        }
        console.error('refreshToken failed:', err);
        res.status(401).json({ status: false, message: 'Invalid refresh token', code: 'UNAUTHORIZED' });
        next(err);
    }
}

export const getUsers = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const users = await getAllUsersFromDB();
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ error: 'Database query failed' });
        next(err)
    }
};

export const postUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userData = createUserSchema.safeParse(req.body ?? {});

        if (!userData.success) {
            return res.status(400).json({
                status: false,
                message: "Validation failed",
                errors: z.flattenError(userData.error)
            });
        }

        const { user_email, user_name } = userData.data

        if (!user_name || !user_email) {
            return res.status(400).json({ status: false, message: 'Name and email are required fields' });
        }

        const user = await postUsersFromDB({ user_name, user_email });
        res.status(201).json({ status: true, message: 'User created', data: user });
    } catch (err) {
        console.error('postUsers failed:', err);
        const message = err instanceof Error ? err.message : 'Database query failed';
        res.status(500).json({ status: false, message });
        next(err);
    }
};

export const putUsers = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    try {
        const userData = createUserSchema.safeParse(req.body ?? {});

        if (!userData.success) {
            return res.status(400).json({
                status: false,
                message: "Validation failed",
                errors: z.flattenError(userData.error)
            });
        }

        const { user_name, user_email } = userData.data;

        const user = await putUsersFromDB({ id: Number(id), user_name, user_email });
        res.status(200).json({ status: true, message: `${user_name} Updated Succesfully`, data: user });
    } catch (err) {
        console.error('putUsers failed:', err);
        const message = err instanceof Error ? err.message : 'Database query failed';
        res.status(500).json({ status: false, message });
        next(err);
    }
};