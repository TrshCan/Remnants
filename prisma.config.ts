import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
    schema: path.join('prisma', 'schema.prisma'),

    // Database URL for migrations and db push
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
