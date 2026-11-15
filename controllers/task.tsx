import type { NextFunction, Request, Response } from 'express';
import z from 'zod';
import { getAllTaskFromDB, getByIdtaskFromDB, postTaskFromDB } from '../services/task.jsx';
import { getUserId } from '@/middlewares/auth.js';

export const createPostSchema = z.object({
    title: z.string().trim().min(2, "Title must contain at least 2 characters").max(100, "Title cannot exceed 100 characters"),
    description: z.string().max(2000, "Description cannot exceed 2000 characters"),
    status: z.enum(["todo", "in_progress", "done"]),
    priority: z.enum(['high', 'medium', 'low']),
    due_date: z.string(),
    userId: z.number()
})

export const getTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getUserId(req);
        if (userId === null) {
            return res.status(401).json({ status: false, message: 'Invalid access token', code: 'UNAUTHORIZED' })
        }

        const result = await getAllTaskFromDB(userId)

        res.status(200).json(result)
    } catch (err) {
        console.log(err)
        res.status(500).json({ error: err || 'Database query failed' });
        next(err)
    }
}

export const getIdTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
         const userId = getUserId(req);
        if (userId === null) {
            return res.status(401).json({ status: false, message: 'Invalid access token', code: 'UNAUTHORIZED' })
        }

        const { id } = req.params
        const result = await getByIdtaskFromDB(id, userId)
        res.status(200).json({ status: true, message: "Task Details", data: result })
    } catch (err) {
        res.status(500).json({ error: err || 'Database query failed' });
        next(err)
    }
}

export const postTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
          const userId = getUserId(req);
        if (userId === null) {
            return res.status(401).json({ status: false, message: 'Invalid access token', code: 'UNAUTHORIZED' })
        }

        const taskData = createPostSchema.safeParse(req.body ?? {});

        if (!taskData.success) {
            return res.status(400).json({
                status: false,
                message: "Validation failed",
                errors: z.flattenError(taskData.error)
            });
        }

        const task = await postTaskFromDB(req, userId);
        console.log(task)
        res.status(201).json({ status: true, message: 'Task created Succesfully', data: task });
    } catch (err) {
        res.status(500).json({ error: err || 'Database query failed' });
        next(err)
    }
}