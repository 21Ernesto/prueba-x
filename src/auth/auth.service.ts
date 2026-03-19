
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../entities/usuario.entity';
import { Rol } from '../entities/rol.entity';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
        @InjectRepository(Rol) private rolRepo: Repository<Rol>,
        private jwtService: JwtService,
    ) { }

    async login(loginDto: LoginDto) {
        const { login, clave } = loginDto;

        const usuario = await this.usuarioRepo.findOne({
            where: { login, condicion: 1 },
        });

        if (!usuario) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const passwordValid = await bcrypt.compare(clave, usuario.clave);
        if (!passwordValid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        // Generar el token igual que antes (puedes dejar los permisos en el payload si lo necesitas para el guard)
        // Pero la respuesta de usuario será igual que getProfileWithPermissions
        const userProfile = await this.getProfileWithPermissions(usuario.idusuario);

        const permisos = userProfile.rol?.permisos?.map((p: any) => p.clave) ?? [];
        const payload = {
            sub: usuario.idusuario,
            login: usuario.login,
            nombre: usuario.nombre,
            idrol: usuario.idrol,
            idcaja: usuario.idcaja,
            idsucursal: usuario.idsucursal,
            imagen: usuario.imagen,
            permisos,
        };

        const token = this.jwtService.sign(payload);

        return {
            access_token: token,
            usuario: userProfile,
        };
    }

    async validateToken(payload: any) {
        return this.usuarioRepo.findOne({
            where: { idusuario: payload.sub, condicion: 1 },
        });
    }

    async getProfileWithPermissions(idusuario: number) {
        const user = await this.usuarioRepo.findOne({
            where: { idusuario, condicion: 1 },
            relations: ['rol', 'rol.permisos'],
        });
        if (!user) throw new UnauthorizedException('Usuario no encontrado');
        // Si es admin, cargar todos los permisos
        let rol = user.rol;
        if (user.idrol === 1) {
            rol = await this.rolRepo.findOne({
                where: { idrol: 1 },
                relations: ['permisos'],
            });
        }
        return {
            idusuario: user.idusuario,
            nombre: user.nombre,
            login: user.login,
            email: user.email,
            telefono: user.telefono,
            imagen: user.imagen,
            idrol: user.idrol,
            idcaja: user.idcaja,
            idsucursal: user.idsucursal,
            rol: {
                idrol: rol?.idrol,
                nombre: rol?.nombre,
                descripcion: rol?.descripcion,
                permisos: rol?.permisos?.map(p => ({
                    idpermiso: p.idpermiso,
                    nombre: p.nombre,
                    clave: p.clave,
                    grupo: p.grupo,
                })) ?? [],
            },
        };
    }
}
