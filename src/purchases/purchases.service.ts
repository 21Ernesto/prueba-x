import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Ingreso } from '../entities/ingreso.entity';
import { DetalleIngreso } from '../entities/detalle-ingreso.entity';
import { Articulo } from '../entities/articulo.entity';
import { AsientoContable } from '../entities/asiento-contable.entity';
import { DetalleAsiento } from '../entities/detalle-asiento.entity';
import { PlanCuentas } from '../entities/plan-cuentas.entity';
import { ArticuloImei } from '../entities/articulo-imei.entity';
import { ArticuloStock } from '../entities/articulo-stock.entity';
import { InventarioMovimiento } from '../entities/inventario-movimiento.entity';

function toNumber(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const n = Number(value.replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

function round2(value: number) {
    return Math.round(value * 100) / 100;
}

@Injectable()
export class PurchasesService {
    constructor(
        @InjectRepository(Ingreso) private ingresoRepo: Repository<Ingreso>,
        @InjectRepository(DetalleIngreso) private detalleRepo: Repository<DetalleIngreso>,
        @InjectRepository(Articulo) private articuloRepo: Repository<Articulo>,
        @InjectRepository(ArticuloImei) private imeiRepo: Repository<ArticuloImei>,
        @InjectRepository(AsientoContable) private asientoRepo: Repository<AsientoContable>,
        @InjectRepository(DetalleAsiento) private detalleAsientoRepo: Repository<DetalleAsiento>,
        @InjectRepository(PlanCuentas) private cuentaRepo: Repository<PlanCuentas>,
        @InjectRepository(ArticuloStock) private stockRepo: Repository<ArticuloStock>,
        @InjectRepository(InventarioMovimiento) private movRepo: Repository<InventarioMovimiento>,
        private dataSource: DataSource,
    ) { }

    async findAll(idusuario?: number, idrol?: number, permisos?: string[], idsucursal?: number) {
        const qb = this.ingresoRepo.createQueryBuilder('i')
            .leftJoinAndSelect('i.proveedor', 'p')
            .leftJoinAndSelect('i.usuario', 'u')
            .orderBy('i.idingreso', 'DESC');

        if (idrol !== 1 && !permisos?.includes('compras_listado_general')) {
            if (idsucursal) {
                qb.andWhere('i.idsucursal = :sid', { sid: idsucursal });
            } else if (idusuario) {
                qb.andWhere('i.idusuario = :uid', { uid: idusuario });
            }
        }
        return qb.getMany();
    }

    async findOne(id: number) {
        return this.ingresoRepo.findOne({
            where: { idingreso: id },
            relations: ['proveedor', 'usuario', 'detalles', 'detalles.articulo', 'detalles.articulo.imeis'],
        });
    }

    async create(dto: any) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
            if (!dto?.idproveedor) throw new BadRequestException('Proveedor requerido');
            const rawItems = Array.isArray(dto?.items)
                ? dto.items
                : Array.isArray(dto?.detalles)
                    ? dto.detalles
                    : [];

            if (rawItems.length === 0) {
                throw new BadRequestException('Agrega al menos un producto');
            }

            const impuestoPct = toNumber(dto.impuesto);
            const subtotal = rawItems.reduce((s: number, item: any) => {
                const cantidad = toNumber(item?.cantidad);
                const precioCompra = toNumber(item?.precio_compra ?? item?.precio);
                return s + cantidad * precioCompra;
            }, 0);

            const computedTotal = round2(subtotal + (impuestoPct > 0 ? (subtotal * impuestoPct) / 100 : 0));
            const totalCompra = toNumber(dto.total_compra) > 0 ? round2(toNumber(dto.total_compra)) : computedTotal;

            const idsucursal = dto.idsucursal;

            const ingreso = qr.manager.create(Ingreso, {
                idproveedor: dto.idproveedor,
                idusuario: dto.idusuario,
                idsucursal,
                tipo_comprobante: dto.tipo_comprobante,
                serie_comprobante: dto.serie_comprobante,
                num_comprobante: dto.num_comprobante,
                fecha_hora: new Date(),
                impuesto: impuestoPct,
                total_compra: totalCompra,
                estado: 'Aceptado',
            });
            const saved = await qr.manager.save(ingreso);

            for (const item of rawItems) {
                const cantidad = toNumber(item?.cantidad);
                const precio_compra = toNumber(item?.precio_compra ?? item?.precio);
                const precio_venta = toNumber(item?.precio_venta);

                if (!item?.idarticulo) throw new BadRequestException('Producto inválido');
                if (cantidad <= 0) throw new BadRequestException('Cantidad inválida');
                if (precio_compra <= 0) throw new BadRequestException('Precio de compra inválido');

                await qr.manager.save(qr.manager.create(DetalleIngreso, {
                    idingreso: saved.idingreso,
                    idarticulo: item.idarticulo,
                    cantidad,
                    precio_compra,
                    precio_venta,
                    estado: 1,
                }));

                // Mantener el precio actual del artículo (para ventas/listados)
                await qr.manager.update(
                    Articulo,
                    { idarticulo: item.idarticulo },
                    {
                        precio_compra,
                        ...(precio_venta > 0 ? { precio_venta } : {}),
                    },
                );

                // --- GESTIÓN DE STOCK POR SUCURSAL ---
                let stockRecord = await qr.manager.findOne(ArticuloStock, {
                    where: { idarticulo: item.idarticulo, idsucursal },
                });

                if (!stockRecord) {
                    stockRecord = qr.manager.create(ArticuloStock, {
                        idarticulo: item.idarticulo,
                        idsucursal,
                        stock: 0,
                    });
                }

                const stockAnterior = stockRecord.stock;
                stockRecord.stock += cantidad;
                await qr.manager.save(stockRecord);

                // --- KARDEX ---
                await qr.manager.save(InventarioMovimiento, {
                    idarticulo: item.idarticulo,
                    idsucursal,
                    idusuario: dto.idusuario,
                    tipo: 'COMPRA',
                    idreferencia: saved.idingreso,
                    cantidad: cantidad,
                    stock_anterior: stockAnterior,
                    stock_actual: stockRecord.stock,
                    motivo: `Compra comprobante ${dto.serie_comprobante}-${dto.num_comprobante}`,
                    fecha: new Date(),
                });

                // Guardar IMEIs si vienen en el item (para teléfonos)
                const imeis = Array.isArray(item.imeis) ? item.imeis : [];
                if (imeis.length > 0) {
                    for (const imei of imeis) {
                        if (String(imei).trim()) {
                            await qr.manager.save(ArticuloImei, {
                                idarticulo: item.idarticulo,
                                imei: String(imei).trim(),
                                idingreso: saved.idingreso
                            });
                        }
                    }
                }
            }

            // Asiento contable
            await this.generarAsientoCompra(qr.manager, saved.idingreso, totalCompra, dto.idusuario);

            await qr.commitTransaction();
            return { idingreso: saved.idingreso, message: 'Compra registrada' };
        } catch (e) {
            await qr.rollbackTransaction();
            throw new BadRequestException('Error al registrar compra: ' + e.message);
        } finally {
            await qr.release();
        }
    }

    async anular(id: number, idusuario?: number) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
            const ingreso = await qr.manager.findOne(Ingreso, {
                where: { idingreso: id },
                relations: ['detalles'],
            });
            if (!ingreso) throw new BadRequestException('Compra no encontrada');
            if (ingreso.estado === 'Anulado') throw new BadRequestException('La compra ya está anulada');

            for (const d of ingreso.detalles) {
                const stockRecord = await qr.manager.findOne(ArticuloStock, {
                    where: { idarticulo: d.idarticulo, idsucursal: ingreso.idsucursal },
                });
                if (stockRecord) {
                    const stockAnterior = stockRecord.stock;
                    stockRecord.stock -= d.cantidad;
                    await qr.manager.save(stockRecord);

                    // Kardex salida por anulación
                    await qr.manager.save(InventarioMovimiento, {
                        idarticulo: d.idarticulo,
                        idsucursal: ingreso.idsucursal,
                        idusuario: idusuario || ingreso.idusuario,
                        tipo: 'COMPRA',
                        idreferencia: ingreso.idingreso,
                        cantidad: -d.cantidad,
                        stock_anterior: stockAnterior,
                        stock_actual: stockRecord.stock,
                        motivo: `Anulación de compra ${ingreso.serie_comprobante}-${ingreso.num_comprobante}`,
                        fecha: new Date(),
                    });
                }
            }
            await qr.manager.update(Ingreso, id, { estado: 'Anulado' });

            // Anular asiento contable
            await qr.manager.update(AsientoContable, { tipo_documento: 'compra', id_documento: id }, { condicion: 0 });

            await qr.commitTransaction();
            return { message: 'Compra anulada' };
        } catch (e) {
            await qr.rollbackTransaction();
            throw new BadRequestException('Error al anular compra: ' + e.message);
        } finally {
            await qr.release();
        }
    }

    private async generarAsientoCompra(manager: any, idcompra: number, total: number, idusuario: number) {
        try {
            const mercaderias = await this.cuentaRepo.findOne({ where: { codigo: '1310' } });
            const proveedores = await this.cuentaRepo.findOne({ where: { codigo: '2210' } });
            if (!mercaderias || !proveedores) return;

            const now = new Date();
            const mes = String(now.getMonth() + 1).padStart(2, '0');
            const count = await this.asientoRepo.count();
            const numero = `${now.getFullYear()}${mes}-${String(count + 1).padStart(4, '0')}`;

            const asiento = manager.create(AsientoContable, {
                fecha: now, numero_asiento: numero, tipo_documento: 'compra',
                id_documento: idcompra, descripcion: `Compra #${idcompra}`,
                total_debe: total, total_haber: total, idusuario,
                idsucursal: (await manager.findOne(Ingreso, { where: { idingreso: idcompra } }))?.idsucursal,
                condicion: 1,
            });
            const saved = await manager.save(asiento);
            await manager.save(manager.create(DetalleAsiento, { idasiento: saved.idasiento, idcuenta: mercaderias.idcuenta, debe: total, haber: 0 }));
            await manager.save(manager.create(DetalleAsiento, { idasiento: saved.idasiento, idcuenta: proveedores.idcuenta, debe: 0, haber: total }));
        } catch { }
    }
}
