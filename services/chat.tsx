import { Content, FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';
import { getTasksByFiltersFromDB, type TaskFilters } from './task.jsx';
import { desc, eq } from 'drizzle-orm';
import { db } from '../config/db.jsx';
import { chatMessage } from '../schema/chat.js';
import { GOOGLE_API_KEY } from '@/utils/jwt.jsx'

const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

// How many past messages are sent to Gemini as context on each call.
const HISTORY_LIMIT = 20;

const getTasksDeclaration: FunctionDeclaration = {
    name: "getTasks",
    description: "Fetch tasks from the database based on optional filters like status, priority, description, due date or title.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            status: {
                type: Type.STRING,
                description: "Filter by task status (e.g., 'pending', 'in_progress', 'completed').",
            },
            priority: {
                type: Type.STRING,
                description: "Filter by priority level (e.g., 'low', 'medium', 'high').",
            },
            description: {
                type: Type.STRING,
                description: "Filter by description",
            },
            title: {
                type: Type.STRING,
                description: "Filter by title.",
            },
            searchQuery: {
                type: Type.STRING,
                description: "Keyword to search in the task title or description.",
            },
        },
    },
};

export const getChatHistory = async (userId: number, limit = 100) => {
    const rows = await db.select({
        id: chatMessage.id,
        role: chatMessage.role,
        content: chatMessage.content,
        createdAt: chatMessage.createdAt,
    }).from(chatMessage)
        .where(eq(chatMessage.userId, userId))
        .orderBy(desc(chatMessage.id))
        .limit(limit);
    return rows.reverse();
};

export const getGoogleChat = async (userId: number, message: string) => {
    const recent = await db.select({ role: chatMessage.role, content: chatMessage.content })
        .from(chatMessage)
        .where(eq(chatMessage.userId, userId))
        .orderBy(desc(chatMessage.id))
        .limit(HISTORY_LIMIT);
    const history = recent.reverse().map(m => ({
        role: m.role,
        parts: [{ text: m.content }],
    }));

    const contents: Content[] = [...history, { role: 'user', parts: [{ text: message }] }];
    const config = {
        systemInstruction: "You are a helpful task assistant. Use the getTasks tool whenever the user asks about their tasks, deadlines, or workload. Keep answers concise.",
        tools: [{ functionDeclarations: [getTasksDeclaration] }],
    };

    let response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents,
        config,
    });

    for (let round = 0; round < 3 && response.functionCalls?.length; round++) {
        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) contents.push(modelContent);

        const responseParts = await Promise.all(
            response.functionCalls.map(async (call) => {
                if (call.name !== 'getTasks') {
                    return { functionResponse: { name: call.name, response: { error: 'Unknown function' } } };
                }
                const tasks = await getTasksByFiltersFromDB(userId, (call.args ?? {}) as TaskFilters);
                return { functionResponse: { name: call.name, response: { tasks } } };
            })
        );
        contents.push({ role: 'user', parts: responseParts });
console.log(contents)
        response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents,
            config,
        });
    }

    const reply = response.text;
    if (!reply) {
        throw new Error('Gemini returned an empty response');
    }

    // Save both sides together, only after Gemini answered, so a failed call
    // never leaves a dangling user message in the history.
    await db.insert(chatMessage).values([
        { userId, role: 'user', content: message },
        { userId, role: 'model', content: reply },
    ]);

    return {
        reply,
        id: response.responseId ?? `h-${new Date()}`,
        createdAt: response.sdkHttpResponse?.headers?.date,
        usage: {
            promptTokens: response.usageMetadata?.promptTokenCount ?? null,
            outputTokens: response.usageMetadata?.candidatesTokenCount ?? null,
            totalTokens: response.usageMetadata?.totalTokenCount ?? null,
        },
    };
};
