import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Persona } from '../entities/persona.entity';

@Injectable()
export class PersonsService {
    constructor(@InjectRepository(Persona) private repo: Repository<Persona>) { }

    findClientes() { return this.repo.find({ where: { tipo_persona: 'Cliente' } }); }
    findProveedores() { return this.repo.find({ where: { tipo_persona: 'Proveedor' } }); }
    findOne(id: number) { return this.repo.findOne({ where: { idpersona: id } }); }

    create(dto: Partial<Persona>) {
        const p = this.repo.create(dto);
        return this.repo.save(p);
    }

    async update(id: number, dto: Partial<Persona>) {
        await this.repo.update(id, dto);
        return { message: 'Persona actualizada' };
    }

    async remove(id: number) {
        await this.repo.delete(id);
        return { message: 'Persona eliminada' };
    }
}
