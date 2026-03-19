import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Venta } from '../entities/venta.entity';
import { Ingreso } from '../entities/ingreso.entity';
import { Gasto } from '../entities/gasto.entity';
import { Persona } from '../entities/persona.entity';
import { Articulo } from '../entities/articulo.entity';
import { Categoria } from '../entities/categoria.entity';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Venta) private ventaRepo: Repository<Venta>,
        @InjectRepository(Ingreso) private ingresoRepo: Repository<Ingreso>,
        @InjectRepository(Gasto) private gastoRepo: Repository<Gasto>,
        @InjectRepository(Persona) private personaRepo: Repository<Persona>,
        @InjectRepository(Articulo) private articuloRepo: Repository<Articulo>,
        @InjectRepository(Categoria) private categoriaRepo: Repository<Categoria>,
    ) { }

    async getSummary(inicio?: string, fin?: string) {
        const queryVentas = this.ventaRepo.createQueryBuilder('v').select('SUM(v.total_venta)', 'total').where("v.estado = 'Aceptado'");
        const queryCompras = this.ingresoRepo.createQueryBuilder('i').select('SUM(i.total_compra)', 'total').where("i.estado = 'Aceptado'");

        let rawGanancia = [{ ganancia: 0 }];
        if (inicio && fin) {
            queryVentas.andWhere('DATE(v.fecha_hora) BETWEEN :inicio AND :fin', { inicio, fin });
            queryCompras.andWhere('DATE(i.fecha_hora) BETWEEN :inicio AND :fin', { inicio, fin });
            rawGanancia = await this.ventaRepo.manager.query(`
                SELECT COALESCE(SUM((dv.precio_venta - dv.precio_compra) * dv.cantidad), 0) as ganancia
                FROM detalle_venta dv
                INNER JOIN venta v ON v.idventa = dv.idventa
                WHERE v.estado = 'Aceptado' AND DATE(v.fecha_hora) BETWEEN ? AND ?
            `, [inicio, fin]);
        } else {
            rawGanancia = await this.ventaRepo.manager.query(`
                SELECT COALESCE(SUM((dv.precio_venta - dv.precio_compra) * dv.cantidad), 0) as ganancia
                FROM detalle_venta dv
                INNER JOIN venta v ON v.idventa = dv.idventa
                WHERE v.estado = 'Aceptado'
            `);
        }

        const [totalVentas, totalCompras, totalClientes, totalProveedores, totalArticulos] = await Promise.all([
            queryVentas.getRawOne(),
            queryCompras.getRawOne(),
            this.personaRepo.count({ where: { tipo_persona: 'Cliente' } }),
            this.personaRepo.count({ where: { tipo_persona: 'Proveedor' } }),
            this.articuloRepo.count({ where: { condicion: 1 } }),
        ]);

        return {
            totalVentas: parseFloat(totalVentas?.total || '0'),
            totalCompras: parseFloat(totalCompras?.total || '0'),
            totalClientes,
            totalProveedores,
            totalArticulos,
            // ganancia_real eliminado del dashboard según solicitud
        };
    }

    // getComparativas removed as requested to remove relative dates
    async getComparativas() {
        return { ventasHoy: 0, ventasAyer: 0, ventasSemana: 0, ventasSemanaAnterior: 0, ventasMes: 0, ventasMesAnterior: 0 };
    }

    async getVentas12Meses(inicio?: string, fin?: string) {
        const queryVentas = this.ventaRepo.createQueryBuilder('v')
            .select("DATE_FORMAT(v.fecha_hora, '%Y-%m')", 'mes')
            .addSelect('COALESCE(SUM(v.total_venta), 0)', 'ventas')
            .where("v.estado = 'Aceptado'");

        const queryCompras = this.ingresoRepo.createQueryBuilder('i')
            .select("DATE_FORMAT(i.fecha_hora, '%Y-%m')", 'mes')
            .addSelect('COALESCE(SUM(i.total_compra), 0)', 'compras')
            .where("i.estado = 'Aceptado'");

        if (inicio && fin) {
            queryVentas.andWhere('DATE(v.fecha_hora) BETWEEN :inicio AND :fin', { inicio, fin });
            queryCompras.andWhere('DATE(i.fecha_hora) BETWEEN :inicio AND :fin', { inicio, fin });
        } else {
            queryVentas.andWhere('v.fecha_hora >= DATE_SUB(NOW(), INTERVAL 12 MONTH)');
            queryCompras.andWhere('i.fecha_hora >= DATE_SUB(NOW(), INTERVAL 12 MONTH)');
        }

        const [ventasRaw, comprasRaw] = await Promise.all([
            queryVentas.groupBy('mes').orderBy('mes', 'ASC').getRawMany(),
            queryCompras.groupBy('mes').orderBy('mes', 'ASC').getRawMany(),
        ]);

        const map = new Map<string, { mes: string; ventas: number; compras: number }>();

        for (const r of ventasRaw as any[]) {
            const mes = String(r.mes);
            map.set(mes, {
                mes,
                ventas: Number(r.ventas ?? r.total ?? 0) || 0,
                compras: 0,
            });
        }
        for (const r of comprasRaw as any[]) {
            const mes = String(r.mes);
            const existing = map.get(mes) ?? { mes, ventas: 0, compras: 0 };
            existing.compras = Number(r.compras ?? r.total ?? 0) || 0;
            map.set(mes, existing);
        }

        return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    }

    async getCompras10Dias() {
        return [];
    }

    async getTopProductos(inicio?: string, fin?: string) {
        const query = this.ventaRepo.createQueryBuilder('v')
            .innerJoin('v.detalles', 'd')
            .innerJoin('d.articulo', 'a')
            .select('a.nombre', 'nombre')
            .addSelect('SUM(d.cantidad)', 'total')
            .where("v.estado = 'Aceptado'");

        if (inicio && fin) {
            query.andWhere('DATE(v.fecha_hora) BETWEEN :inicio AND :fin', { inicio, fin });
        }

        return query
            .groupBy('a.idarticulo')
            .orderBy('total', 'DESC')
            .limit(5)
            .getRawMany();
    }

    async getInventarioSummary() {
        const [totalArticulos, totalStock, totalCategorias] = await Promise.all([
            this.articuloRepo.count({ where: { condicion: 1 } }),
            this.articuloRepo.createQueryBuilder('a').select('SUM(a.stock)', 'total').where('a.condicion = 1').getRawOne(),
            this.categoriaRepo.count({ where: { condicion: 1 } }),
        ]);
        return { totalArticulos, totalStock: totalStock?.total || 0, totalCategorias };
    }
}
