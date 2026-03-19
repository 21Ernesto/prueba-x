import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from '../entities/categoria.entity';

@Injectable()
export class CategoriesService {
    constructor(@InjectRepository(Categoria) private repo: Repository<Categoria>) { }

    findAll() {
        return this.repo.find({ where: { condicion: 1 } });
    }

    findOne(id: number) {
        return this.repo.findOne({ where: { idcategoria: id } });
    }

    create(nombre: string, descripcion: string) {
        const cat = this.repo.create({ nombre, descripcion, condicion: 1 });
        return this.repo.save(cat);
    }

    async update(id: number, nombre: string, descripcion: string) {
        await this.repo.update(id, { nombre, descripcion });
        return { message: 'Categoría actualizada' };
    }

    async deactivate(id: number) {
        await this.repo.update(id, { condicion: 0 });
        return { message: 'Categoría desactivada' };
    }

    async activate(id: number) {
        await this.repo.update(id, { condicion: 1 });
        return { message: 'Categoría activada' };
    }
}
