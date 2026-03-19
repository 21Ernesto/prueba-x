import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // IMPORTANT: usar el mismo origen que JwtModule.registerAsync
            // para evitar 401 si el backend arranca con un .env distinto
            secretOrKey: config.get<string>('JWT_SECRET') || 'venzo_secret_key',
        });
    }

    // La firma del JWT ya garantiza la autenticidad.
    // No hacemos consulta a DB aquí para evitar 401 por errores transitorios de BD.
    validate(payload: any) {
        return {
            ...payload,
            idusuario: payload.sub,
        };
    }
}
