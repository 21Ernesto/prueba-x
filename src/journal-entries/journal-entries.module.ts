import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsientoContable } from '../entities/asiento-contable.entity';
import { DetalleAsiento } from '../entities/detalle-asiento.entity';
import { PlanCuentas } from '../entities/plan-cuentas.entity';
import { Venta } from '../entities/venta.entity';
import { Ingreso } from '../entities/ingreso.entity';
import { Gasto } from '../entities/gasto.entity';
import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';

@Injectable()
class JournalEntriesService {
    constructor(
        @InjectRepository(AsientoContable) private asientoRepo: Repository<AsientoContable>,
        @InjectRepository(DetalleAsiento) private detalleRepo: Repository<DetalleAsiento>,
        @InjectRepository(PlanCuentas) private cuentaRepo: Repository<PlanCuentas>,
        @InjectRepository(Venta) private ventaRepo: Repository<Venta>,
        @InjectRepository(Ingreso) private ingresoRepo: Repository<Ingreso>,
        @InjectRepository(Gasto) private gastoRepo: Repository<Gasto>,
        private dataSource: DataSource,
    ) { }

    findAll(inicio: string, fin: string) {
        return this.asientoRepo.createQueryBuilder('a')
            .leftJoinAndSelect('a.usuario', 'u')
            .where('DATE(a.fecha) BETWEEN :inicio AND :fin', { inicio, fin })
            .orderBy('a.idasiento', 'DESC')
            .getMany();
    }

    findOne(id: number) {
        return this.asientoRepo.findOne({ where: { idasiento: id }, relations: ['usuario', 'detalles', 'detalles.cuenta'] });
    }

    findDetalles(id: number) {
        return this.detalleRepo.find({ where: { idasiento: id }, relations: ['cuenta'] });
    }

    async getLibroDiario(inicio: string, fin: string) {
        return this.asientoRepo.createQueryBuilder('a')
            .leftJoinAndSelect('a.detalles', 'd')
            .leftJoinAndSelect('d.cuenta', 'c')
            .leftJoinAndSelect('a.usuario', 'u')
            .where('a.condicion = 1 AND DATE(a.fecha) BETWEEN :inicio AND :fin', { inicio, fin })
            .orderBy('a.fecha', 'DESC')
            .getMany();
    }

    async create(dto: any, idusuario: number) {
        const totalDebe = dto.detalles.reduce((s: number, d: any) => s + parseFloat(d.debe || 0), 0);
        const totalHaber = dto.detalles.reduce((s: number, d: any) => s + parseFloat(d.haber || 0), 0);

        if (Math.abs(totalDebe - totalHaber) > 0.01) {
            throw new BadRequestException('El total debe ser igual al total haber');
        }

        const count = await this.asientoRepo.count();
        const now = new Date();
        const mes = String(now.getMonth() + 1).padStart(2, '0');
        const numero = `${now.getFullYear()}${mes}-${String(count + 1).padStart(4, '0')}`;

        const asiento = this.asientoRepo.create({
            fecha: new Date(dto.fecha),
            numero_asiento: numero,
            tipo_documento: 'ajuste',
            descripcion: dto.descripcion,
            total_debe: totalDebe,
            total_haber: totalHaber,
            idusuario,
            condicion: 1,
        });
        const saved = await this.asientoRepo.save(asiento);

        for (const d of dto.detalles) {
            await this.detalleRepo.save(this.detalleRepo.create({
                idasiento: saved.idasiento,
                idcuenta: d.idcuenta,
                debe: d.debe || 0,
                haber: d.haber || 0,
            }));
        }
        return saved;
    }

    async anular(id: number) {
        await this.asientoRepo.update(id, { condicion: 0 });
        return { message: 'Asiento anulado' };
    }

    findCuentasDetalle() {
        return this.cuentaRepo.find({ where: { nivel: 2, condicion: 1 }, order: { codigo: 'ASC' } });
    }

    async getIncomeExpense(inicio: string, fin: string) {
        const ventas = await this.ventaRepo.createQueryBuilder('v')
            .select('COALESCE(SUM(v.total_venta), 0)', 'total')
            .where("v.estado = 'Aceptado' AND DATE(v.fecha_hora) BETWEEN :inicio AND :fin", { inicio, fin })
            .getRawOne();

        const compras = await this.ingresoRepo.createQueryBuilder('i')
            .select('COALESCE(SUM(i.total_compra), 0)', 'total')
            .where("i.estado = 'Aceptado' AND DATE(i.fecha_hora) BETWEEN :inicio AND :fin", { inicio, fin })
            .getRawOne();

        const gastos = await this.gastoRepo.createQueryBuilder('g')
            .select('COALESCE(SUM(g.monto), 0)', 'total')
            .where('g.condicion = 1 AND DATE(g.fecha) BETWEEN :inicio AND :fin', { inicio, fin })
            .getRawOne();

        // Calcular ganancia real sumando (precio_venta - precio_compra) * cantidad de los detalles de venta
        const rawGanancia = await this.dataSource.createQueryRunner().query(`
            SELECT COALESCE(SUM((dv.precio_venta - dv.precio_compra) * dv.cantidad), 0) as ganancia
            FROM detalle_venta dv
            INNER JOIN venta v ON v.idventa = dv.idventa
            WHERE v.estado = 'Aceptado' AND DATE(v.fecha_hora) BETWEEN ? AND ?
        `, [inicio, fin]);
        const gananciaReal = parseFloat(rawGanancia?.[0]?.ganancia || 0);

        // Detalle de ganancia por producto
        const detalleGanancia = await this.dataSource.createQueryRunner().query(`
            SELECT a.nombre as producto, SUM(dv.cantidad) as cantidad, SUM(dv.precio_venta * dv.cantidad) as total_venta, SUM(dv.precio_compra * dv.cantidad) as total_compra, SUM((dv.precio_venta - dv.precio_compra) * dv.cantidad) as ganancia
            FROM detalle_venta dv
            INNER JOIN venta v ON v.idventa = dv.idventa
            INNER JOIN articulo a ON a.idarticulo = dv.idarticulo
            WHERE v.estado = 'Aceptado' AND DATE(v.fecha_hora) BETWEEN ? AND ?
            GROUP BY a.idarticulo, a.nombre
            ORDER BY ganancia DESC
        `, [inicio, fin]);

        const ingresos = parseFloat(ventas?.total || 0);
        const egresos = parseFloat(compras?.total || 0) + parseFloat(gastos?.total || 0);

        return { ingresos, egresos, ganancia: ingresos - egresos, ganancia_real: gananciaReal, detalle_ganancia: detalleGanancia };
    }
}

@Controller('journal-entries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class JournalEntriesController {
    constructor(private service: JournalEntriesService) { }

    @Get()
    @RequirePermissions('reportes_asientos')
    findAll(@Query('inicio') inicio: string, @Query('fin') fin: string) {
        return this.service.findAll(inicio || '2000-01-01', fin || new Date().toISOString().split('T')[0]);
    }

    @Get('libro-diario')
    @RequirePermissions('reportes_libro_diario')
    getLibroDiario(@Query('inicio') inicio: string, @Query('fin') fin: string) {
        return this.service.getLibroDiario(inicio || '2000-01-01', fin || new Date().toISOString().split('T')[0]);
    }

    @Get('income-expense')
    @RequirePermissions('reportes_ingresos_egresos')
    getIncomeExpense(@Query('inicio') inicio: string, @Query('fin') fin: string) {
        return this.service.getIncomeExpense(inicio || '2000-01-01', fin || new Date().toISOString().split('T')[0]);
    }

    @Get('cuentas')
    findCuentas() { return this.service.findCuentasDetalle(); }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

    @Get(':id/detalles')
    findDetalles(@Param('id', ParseIntPipe) id: number) { return this.service.findDetalles(id); }

    @Post()
    @RequirePermissions('reportes_asientos')
    create(@Body() body: any, @CurrentUser('idusuario') uid: number) {
        return this.service.create(body, uid);
    }

    @Patch(':id/anular')
    @RequirePermissions('reportes_asientos')
    anular(@Param('id', ParseIntPipe) id: number) { return this.service.anular(id); }
}

@Module({
    imports: [TypeOrmModule.forFeature([AsientoContable, DetalleAsiento, PlanCuentas, Venta, Ingreso, Gasto])],
    controllers: [JournalEntriesController],
    providers: [JournalEntriesService],
})
export class JournalEntriesModule { }
