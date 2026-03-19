import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sucursal } from '../entities/sucursal.entity';

@Injectable()
export class BranchesService {
    constructor(
        @InjectRepository(Sucursal) private sucursalRepo: Repository<Sucursal>,
    ) { }

    async findAll() {
        return this.sucursalRepo.find({ where: { condicion: 1 } });
    }

    async findOne(id: number) {
        const sucursal = await this.sucursalRepo.findOne({ where: { idsucursal: id } });
        if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
        return sucursal;
    }

    async create(data: Partial<Sucursal>) {
        const sucursal = this.sucursalRepo.create({ ...data, condicion: 1 });
        return this.sucursalRepo.save(sucursal);
    }

    async update(id: number, data: Partial<Sucursal>) {
        await this.findOne(id);
        await this.sucursalRepo.update(id, data);
        return this.findOne(id);
    }

    async deactivate(id: number) {
        await this.sucursalRepo.update(id, { condicion: 0 });
        return { message: 'Sucursal desactivada' };
    }
}
