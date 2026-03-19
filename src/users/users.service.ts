import { Injectable, NotFoundException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '../entities/usuario.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(Usuario) private repo: Repository<Usuario>,
    ) { }

    async findAll(idsucursal?: number) {
        const qb = this.repo.createQueryBuilder('u')
            .leftJoinAndSelect('u.rol', 'r')
            .leftJoin('usuario', 'sup', 'sup.idusuario = u.idpadre')
            .addSelect(['sup.nombre'])
            .where('u.condicion = 1');

        if (idsucursal) {
            qb.andWhere('u.idsucursal = :sid', { sid: idsucursal });
        }
        return qb.getMany();
    }

    async findOne(id: number) {
        const user = await this.repo.findOne({ where: { idusuario: id }, relations: ['rol'] });
        if (!user) throw new NotFoundException('Usuario no encontrado');
        const { clave, ...rest } = user as any;
        return rest;
    }

    async create(dto: CreateUserDto, imagen?: string) {
        const existing = await this.repo.findOne({ where: { login: dto.login } });
        if (existing) throw new ConflictException('El login ya está en uso');

        if (dto.idcaja !== null && dto.idcaja !== undefined) {
            const cajaTaken = await this.repo.findOne({ where: { idcaja: dto.idcaja, condicion: 1 } });
            if (cajaTaken) throw new ConflictException('Esta caja ya está asignada a otro usuario');
        }

        const hashedPassword = await bcrypt.hash(dto.clave, 10);
        const usuario = this.repo.create({
            ...dto,
            clave: hashedPassword,
            imagen: imagen || null,
            condicion: 1,
            // idsucursal usually comes in dto or passed from controller
        });
        return this.repo.save(usuario);
    }

    async update(id: number, dto: UpdateUserDto, imagen?: string) {
        const usuario = await this.repo.findOne({ where: { idusuario: id } });
        if (!usuario) throw new NotFoundException('Usuario no encontrado');

        if (dto.idcaja !== null && dto.idcaja !== undefined) {
            const cajaTaken = await this.repo.createQueryBuilder('u')
                .where('u.idcaja = :idcaja AND u.condicion = 1 AND u.idusuario <> :id', { idcaja: dto.idcaja, id })
                .getOne();
            if (cajaTaken) throw new ConflictException('Esta caja ya está asignada a otro usuario');
        }

        const updates: Partial<Usuario> = { ...dto } as any;
        if (dto.clave) {
            updates.clave = await bcrypt.hash(dto.clave, 10);
        } else {
            delete updates.clave;
        }
        if (imagen) updates.imagen = imagen;

        await this.repo.update(id, updates);
        return { message: 'Usuario actualizado' };
    }

    async deactivate(id: number) {
        await this.repo.update(id, { condicion: 0 });
        return { message: 'Usuario desactivado' };
    }

    async activate(id: number) {
        await this.repo.update(id, { condicion: 1 });
        return { message: 'Usuario activado' };
    }

    async changePassword(id: number, clave_actual: string, clave_nueva: string) {
        const usuario = await this.repo.findOne({ where: { idusuario: id } });
        if (!usuario) throw new NotFoundException('Usuario no encontrado');

        const valid = await bcrypt.compare(clave_actual, usuario.clave);
        if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

        const hashed = await bcrypt.hash(clave_nueva, 10);
        await this.repo.update(id, { clave: hashed });
        return { message: 'Contraseña actualizada' };
    }

    async updateProfile(id: number, dto: UpdateUserDto, imagen?: string) {
        const updates: Partial<Usuario> = {
            nombre: dto.nombre,
            email: dto.email,
            telefono: dto.telefono,
            direccion: dto.direccion,
        } as any;
        if (dto.clave) updates.clave = await bcrypt.hash(dto.clave, 10);
        if (imagen) updates.imagen = imagen;
        await this.repo.update(id, updates);
        return this.findOne(id);
    }

    async selectRoles() {
        const { Rol } = await import('../entities/rol.entity');
        return [];
    }

    async selectCajas() {
        return [];
    }
}
