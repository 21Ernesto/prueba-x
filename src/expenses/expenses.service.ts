import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Gasto } from '../entities/gasto.entity';
import { AsientoContable } from '../entities/asiento-contable.entity';
import { DetalleAsiento } from '../entities/detalle-asiento.entity';
import { PlanCuentas } from '../entities/plan-cuentas.entity';

@Injectable()
export class ExpensesService {
    constructor(
        @InjectRepository(Gasto) private repo: Repository<Gasto>,
        @InjectRepository(AsientoContable) private asientoRepo: Repository<AsientoContable>,
        @InjectRepository(DetalleAsiento) private detalleAsientoRepo: Repository<DetalleAsiento>,
        @InjectRepository(PlanCuentas) private cuentaRepo: Repository<PlanCuentas>,
        private dataSource: DataSource,
    ) { }

    async findAll(idusuario?: number, idrol?: number, idsucursal?: number) {
        const qb = this.repo
            .createQueryBuilder('g')
            .leftJoinAndSelect('g.usuario', 'u')
            .where('g.condicion = :cond', { cond: 1 })
            .orderBy('g.idgasto', 'DESC');

        if (idrol !== 1) {
            if (idsucursal) {
                qb.andWhere('g.idsucursal = :sid', { sid: idsucursal });
            } else if (idusuario) {
                qb.andWhere('g.idusuario = :uid', { uid: idusuario });
            }
        }
        return qb.getMany();
    }

    findOne(id: number) {
        return this.repo.findOne({ where: { idgasto: id } });
    }

    async create(dto: any, idusuario: number) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
            const gasto = qr.manager.create(Gasto, {
                fecha: new Date(dto.fecha),
                referencia: dto.referencia,
                descripcion: dto.descripcion,
                monto: dto.monto,
                condicion: 1,
                idusuario,
                idsucursal: dto.idsucursal,
            });
            const saved = await qr.manager.save(gasto);
            await this.generarAsientoGasto(qr.manager, saved.idgasto, dto.monto, dto.descripcion, idusuario);
            await qr.commitTransaction();
            return saved;
        } catch (e) {
            await qr.rollbackTransaction();
            throw e;
        } finally {
            await qr.release();
        }
    }

    async update(id: number, dto: any) {
        await this.repo.update(id, { fecha: new Date(dto.fecha), referencia: dto.referencia, descripcion: dto.descripcion, monto: dto.monto });
        return { message: 'Gasto actualizado' };
    }

    async deactivate(id: number) {
        await this.repo.update(id, { condicion: 0 });
        return { message: 'Gasto desactivado' };
    }

    async activate(id: number) {
        await this.repo.update(id, { condicion: 1 });
        return { message: 'Gasto activado' };
    }

    private async generarAsientoGasto(manager: any, idgasto: number, monto: number, descripcion: string, idusuario: number) {
        try {
            const gastoOficina = await this.cuentaRepo.findOne({ where: { codigo: '5110' } });
            const caja = await this.cuentaRepo.findOne({ where: { codigo: '1010' } });
            if (!gastoOficina || !caja) return;

            const now = new Date();
            const mes = String(now.getMonth() + 1).padStart(2, '0');
            const count = await this.asientoRepo.count();
            const numero = `${now.getFullYear()}${mes}-${String(count + 1).padStart(4, '0')}`;

            const asiento = manager.create(AsientoContable, {
                fecha: now, numero_asiento: numero, tipo_documento: 'gasto',
                id_documento: idgasto, descripcion: `Gasto: ${descripcion}`,
                total_debe: monto, total_haber: monto, idusuario, 
                idsucursal: (await manager.findOne(Gasto, { where: { idgasto } }))?.idsucursal,
                condicion: 1,
            });
            const saved = await manager.save(asiento);
            await manager.save(manager.create(DetalleAsiento, { idasiento: saved.idasiento, idcuenta: gastoOficina.idcuenta, debe: monto, haber: 0 }));
            await manager.save(manager.create(DetalleAsiento, { idasiento: saved.idasiento, idcuenta: caja.idcuenta, debe: 0, haber: monto }));
        } catch { }
    }
}
