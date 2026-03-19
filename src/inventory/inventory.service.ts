import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ArticuloStock } from '../entities/articulo-stock.entity';
import { InventarioMovimiento } from '../entities/inventario-movimiento.entity';
import { Articulo } from '../entities/articulo.entity';

@Injectable()
export class InventoryService {
    constructor(
        @InjectRepository(ArticuloStock) private stockRepo: Repository<ArticuloStock>,
        @InjectRepository(InventarioMovimiento) private movimientoRepo: Repository<InventarioMovimiento>,
        @InjectRepository(Articulo) private articuloRepo: Repository<Articulo>,
        private dataSource: DataSource,
    ) { }

    async getStockByBranch(idsucursal: number) {
        return this.stockRepo.find({
            where: { idsucursal },
            relations: ['articulo'],
        });
    }

    async getKardex(idarticulo: number, idsucursal: number) {
        return this.movimientoRepo.find({
            where: { idarticulo, idsucursal },
            order: { fecha: 'DESC' },
            relations: ['usuario'],
        });
    }

    async adjustStock(data: {
        idarticulo: number;
        idsucursal: number;
        idusuario: number;
        cantidad: number;
        motivo: string;
    }) {
        return this.dataSource.transaction(async (manager) => {
            let stockEntity = await manager.findOne(ArticuloStock, {
                where: { idarticulo: data.idarticulo, idsucursal: data.idsucursal },
            });

            if (!stockEntity) {
                stockEntity = manager.create(ArticuloStock, {
                    idarticulo: data.idarticulo,
                    idsucursal: data.idsucursal,
                    stock: 0,
                });
            }

            const stockAnterior = stockEntity.stock;
            stockEntity.stock += data.cantidad;
            await manager.save(ArticuloStock, stockEntity);

            const movimiento = manager.create(InventarioMovimiento, {
                idarticulo: data.idarticulo,
                idsucursal: data.idsucursal,
                idusuario: data.idusuario,
                tipo: 'AJUSTE',
                cantidad: data.cantidad,
                stock_anterior: stockAnterior,
                stock_actual: stockEntity.stock,
                motivo: data.motivo,
            });
            await manager.save(InventarioMovimiento, movimiento);

            return stockEntity;
        });
    }

    async transferStock(data: {
        idarticulo: number;
        idorigin: number;
        iddestination: number;
        idusuario: number;
        cantidad: number;
        motivo: string;
    }) {
        return this.dataSource.transaction(async (manager) => {
            // Salida de origen
            let originStock = await manager.findOne(ArticuloStock, {
                where: { idarticulo: data.idarticulo, idsucursal: data.idorigin },
            });
            if (!originStock || originStock.stock < data.cantidad) {
                throw new Error('Stock insuficiente en sucursal de origen');
            }

            const stockAntO = originStock.stock;
            originStock.stock -= data.cantidad;
            await manager.save(ArticuloStock, originStock);

            await manager.save(InventarioMovimiento, {
                idarticulo: data.idarticulo,
                idsucursal: data.idorigin,
                idusuario: data.idusuario,
                tipo: 'TRASLADO_SALIDA',
                cantidad: -data.cantidad,
                stock_anterior: stockAntO,
                stock_actual: originStock.stock,
                motivo: data.motivo,
            });

            // Entrada en destino
            let destStock = await manager.findOne(ArticuloStock, {
                where: { idarticulo: data.idarticulo, idsucursal: data.iddestination },
            });
            if (!destStock) {
                destStock = manager.create(ArticuloStock, {
                    idarticulo: data.idarticulo,
                    idsucursal: data.iddestination,
                    stock: 0,
                });
            }

            const stockAntD = destStock.stock;
            destStock.stock += data.cantidad;
            await manager.save(ArticuloStock, destStock);

            await manager.save(InventarioMovimiento, {
                idarticulo: data.idarticulo,
                idsucursal: data.iddestination,
                idusuario: data.idusuario,
                tipo: 'TRASLADO_ENTRADA',
                cantidad: data.cantidad,
                stock_anterior: stockAntD,
                stock_actual: destStock.stock,
                motivo: data.motivo,
            });

            return { success: true };
        });
    }
}
