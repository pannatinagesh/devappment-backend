import { getUserId } from '@/middlewares/auth.js';
import { getChatHistory, getGoogleChat } from '@/services/chat.js'
import type { Request, Response, NextFunction } from 'express'

export const postChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getUserId(req);
        if (userId === null) {
            return res.status(401).json({ status: false, message: 'Invalid access token', code: 'UNAUTHORIZED' })
        }

        const message = typeof req.body?.message === 'string' ? req.body.message.trim() : ''
        if (!message) {
            return res.status(400).json({ status: false, message: "Please Enter Some message" })
        }

        const result = await getGoogleChat(userId, message)
        res.status(200).json({ status: true, data: result })
    } catch (err) {
        console.error('postChat failed:', err)
        res.status(500).json({ status: false, message: 'Chat request failed' });
        next(err)
    }
}

export const getChat = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = getUserId(req);
        if (userId === null) {
            return res.status(401).json({ status: false, message: 'Invalid access token', code: 'UNAUTHORIZED' })
        }

        const messages = await getChatHistory(userId)
        res.status(200).json({ status: true, data: messages })
    } catch (err) {
        console.error('getChat failed:', err)
        res.status(500).json({ status: false, message: 'Failed to load chat history' });
        next(err)
    }
}
