import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from '../entities/venta.entity';
import { Ingreso } from '../entities/ingreso.entity';
import { Gasto } from '../entities/gasto.entity';
import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('graphics')
@UseGuards(JwtAuthGuard)
class GraphicsController {
    constructor(
        @InjectRepository(Venta) private ventaRepo: Repository<Venta>,
        @InjectRepository(Ingreso) private ingresoRepo: Repository<Ingreso>,
    ) { }

    @Get('ventas')
    async ventas(@Query('inicio') inicio: string, @Query('fin') fin: string) {
        return this.ventaRepo.createQueryBuilder('v')
            .select("DATE(v.fecha_hora)", 'fecha')
            .addSelect('SUM(v.total_venta)', 'total')
            .where("v.estado = 'Aceptado' AND DATE(v.fecha_hora) BETWEEN :inicio AND :fin", { inicio, fin })
            .groupBy('fecha')
            .orderBy('fecha', 'ASC')
            .getRawMany();
    }

    @Get('compras')
    async compras(@Query('inicio') inicio: string, @Query('fin') fin: string) {
        return this.ingresoRepo.createQueryBuilder('i')
            .select("DATE(i.fecha_hora)", 'fecha')
            .addSelect('SUM(i.total_compra)', 'total')
            .where("i.estado = 'Aceptado' AND DATE(i.fecha_hora) BETWEEN :inicio AND :fin", { inicio, fin })
            .groupBy('fecha')
            .orderBy('fecha', 'ASC')
            .getRawMany();
    }

    @Get('ventas-12-meses')
    async ventas12Meses() {
        return this.ventaRepo.createQueryBuilder('v')
            .select("DATE_FORMAT(v.fecha_hora, '%Y-%m')", 'mes')
            .addSelect('SUM(v.total_venta)', 'total')
            .where("v.estado = 'Aceptado' AND v.fecha_hora >= DATE_SUB(NOW(), INTERVAL 12 MONTH)")
            .groupBy('mes')
            .orderBy('mes', 'ASC')
            .getRawMany();
    }

    @Get('compras-12-meses')
    async compras12Meses() {
        return this.ingresoRepo.createQueryBuilder('i')
            .select("DATE_FORMAT(i.fecha_hora, '%Y-%m')", 'mes')
            .addSelect('SUM(i.total_compra)', 'total')
            .where("i.estado = 'Aceptado' AND i.fecha_hora >= DATE_SUB(NOW(), INTERVAL 12 MONTH)")
            .groupBy('mes')
            .orderBy('mes', 'ASC')
            .getRawMany();
    }
}

@Module({
    imports: [TypeOrmModule.forFeature([Venta, Ingreso, Gasto])],
    controllers: [GraphicsController],
})
export class GraphicsModule { }
