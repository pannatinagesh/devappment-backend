import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import express, { json } from 'express';
import { db } from './config/db.jsx'; // Drizzle database instance
import Route from './routes/index.jsx';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173']; // Fallback to your local Vite dev server port

const corsOptions = {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(json());
app.use(cookieParser());
app.use(cors(corsOptions));
app.options('/*splat', cors(corsOptions));
app.use('/api', Route);

// Test Neon database connectivity right at startup
const testDbConnection = async () => {
    try {
        const rows = await db.execute(sql`SELECT NOW()`);
        console.log('✅ Connected to Neon PostgreSQL successfully at:', rows[0]);
    } catch (err) {
        console.error('❌ Failed to connect to Neon PostgreSQL:', err);
    }
};

testDbConnection();

app.get('/', (_req, res) => {
    res.json({
        message: 'Welcome to the API!',

    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
