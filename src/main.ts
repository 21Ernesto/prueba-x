import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'fs';

async function bootstrap() {
    process.env.TZ = process.env.TZ_DEFAULT || 'America/Santo_Domingo';

    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    console.log('[ENV] FRONTEND_URL  :', process.env.FRONTEND_URL);
    console.log('[ENV] CORS_ORIGINS  :', process.env.CORS_ORIGINS);

    const allowedOrigins: string[] = [
        'https://venzo.infinicord.com',
        process.env.FRONTEND_URL,
        ...(process.env.CORS_ORIGINS ?? '').split(','),
    ]
        .map((o) => (o ?? '').trim())
        .filter(Boolean);

    console.log('[CORS] Orígenes permitidos:', allowedOrigins);

    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.warn(`[CORS] Origen BLOQUEADO: ${origin}`);
            return callback(null, false);
        },
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
        exposedHeaders: ['Content-Disposition'],
        credentials: false,
        optionsSuccessStatus: 204,
        maxAge: 86400,
    });

    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3000;
    await app.listen(port);

    console.log(`🚀 Backend Venzo corriendo en: http://localhost:${port}/api`);
}

bootstrap();