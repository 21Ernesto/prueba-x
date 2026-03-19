import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Rol } from '../entities/rol.entity';
import { Permiso } from '../entities/permiso.entity';

@Injectable()
export class RolesService {
    constructor(
        @InjectRepository(Rol) private rolRepo: Repository<Rol>,
        @InjectRepository(Permiso) private permisoRepo: Repository<Permiso>,
    ) { }

    async findAll() {
        return this.rolRepo.find({ where: { estado: 1 } });
    }

    async findOne(id: number) {
        const rol = await this.rolRepo.findOne({
            where: { idrol: id },
            relations: ['permisos'],
        });
        if (!rol) throw new NotFoundException('Rol no encontrado');
        return rol;
    }

    async create(nombre: string, descripcion: string, permisosIds: number[]) {
        const permisos = permisosIds?.length
            ? await this.permisoRepo.findBy({ idpermiso: In(permisosIds) })
            : [];
        const rol = this.rolRepo.create({ nombre, descripcion, estado: 1, permisos });
        return this.rolRepo.save(rol);
    }

    async update(id: number, nombre: string, descripcion: string, permisosIds: number[]) {
        const rol = await this.findOne(id);
        rol.nombre = nombre;
        rol.descripcion = descripcion;
        rol.permisos = permisosIds?.length
            ? await this.permisoRepo.findBy({ idpermiso: In(permisosIds) })
            : [];
        return this.rolRepo.save(rol);
    }

    async deactivate(id: number) {
        await this.rolRepo.update(id, { estado: 0 });
        return { message: 'Rol desactivado' };
    }

    async activate(id: number) {
        await this.rolRepo.update(id, { estado: 1 });
        return { message: 'Rol activado' };
    }

    async getAllPermissions() {
        return this.permisoRepo.find();
    }

    async updatePermissions(id: number, permIds: number[]) {
        const rol = await this.findOne(id);
        rol.permisos = permIds?.length
            ? await this.permisoRepo.findBy({ idpermiso: In(permIds) })
            : [];
        await this.rolRepo.save(rol);
        return { message: 'Permisos actualizados' };
    }
}
