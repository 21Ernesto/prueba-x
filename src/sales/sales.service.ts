import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Venta } from '../entities/venta.entity';
import { DetalleVenta } from '../entities/detalle-venta.entity';
import { Articulo } from '../entities/articulo.entity';
import { CajaSesion } from '../entities/caja-sesion.entity';
import { AsientoContable } from '../entities/asiento-contable.entity';
import { DetalleAsiento } from '../entities/detalle-asiento.entity';
import { PlanCuentas } from '../entities/plan-cuentas.entity';
import { CompPago } from '../entities/comp-pago.entity';
import { TipoPago } from '../entities/tipo-pago.entity';
import { ArticuloImei } from '../entities/articulo-imei.entity';
import { ArticuloStock } from '../entities/articulo-stock.entity';
import { InventarioMovimiento } from '../entities/inventario-movimiento.entity';

interface ItemVenta {
    idarticulo: number;
    cantidad: number;
    precio_compra: number;
    precio_venta: number;
    descuento?: number;
    imei?: string;
}

@Injectable()
export class SalesService {
    constructor(
        @InjectRepository(Venta) private ventaRepo: Repository<Venta>,
        @InjectRepository(DetalleVenta) private detalleRepo: Repository<DetalleVenta>,
        @InjectRepository(Articulo) private articuloRepo: Repository<Articulo>,
        @InjectRepository(CajaSesion) private cajaSesionRepo: Repository<CajaSesion>,
        @InjectRepository(AsientoContable) private asientoRepo: Repository<AsientoContable>,
        @InjectRepository(DetalleAsiento) private detalleAsientoRepo: Repository<DetalleAsiento>,
        @InjectRepository(PlanCuentas) private cuentaRepo: Repository<PlanCuentas>,
        @InjectRepository(CompPago) private compPagoRepo: Repository<CompPago>,
        @InjectRepository(TipoPago) private tipoPagoRepo: Repository<TipoPago>,
        @InjectRepository(ArticuloImei) private imeiRepo: Repository<ArticuloImei>,
        @InjectRepository(ArticuloStock) private stockRepo: Repository<ArticuloStock>,
        @InjectRepository(InventarioMovimiento) private movRepo: Repository<InventarioMovimiento>,
        private dataSource: DataSource,
    ) { }

    private toNumber(value: unknown): number {
        if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
        if (typeof value === 'string' && value.trim() !== '') {
            const n = Number(value.replace(',', '.'));
            return Number.isFinite(n) ? n : NaN;
        }
        return NaN;
    }

    async findAll(idusuario?: number, idrol?: number, permisos?: string[], fecha_inicio?: string, fecha_fin?: string, idsucursal?: number) {
        const qb = this.ventaRepo.createQueryBuilder('v')
            .leftJoinAndSelect('v.cliente', 'c')
            .leftJoinAndSelect('v.usuario', 'u')
            .leftJoinAndSelect('v.caja', 'caja')
            .orderBy('v.idventa', 'DESC');

        if (idrol !== 1 && !permisos?.includes('ventas_listado_general')) {
            if (idsucursal) {
                qb.andWhere('v.idsucursal = :sid', { sid: idsucursal });
            } else if (idusuario) {
                qb.andWhere('v.idusuario = :uid', { uid: idusuario });
            }
        }
        if (fecha_inicio) {
            qb.andWhere('DATE(v.fecha_hora) >= :fi', { fi: fecha_inicio });
        }
        if (fecha_fin) {
            qb.andWhere('DATE(v.fecha_hora) <= :ff', { ff: fecha_fin });
        }
        return qb.getMany();
    }

    async findOne(id: number) {
        return this.ventaRepo.findOne({
            where: { idventa: id },
            relations: ['cliente', 'usuario', 'detalles', 'detalles.articulo'],
        });
    }

    async create(dto: {
        idcliente?: number;
        idusuario: number;
        tipo_comprobante?: string;
        impuesto?: number;
        total_venta?: number;
        tipo_pago?: string;
        num_transac?: string;
        idcaja?: number;
        idsucursal?: number;
        items?: ItemVenta[];
        // Compat front-venzo
        idtipopago?: number;
        idcomprobante?: number;
        detalles?: Array<{ idarticulo: number; cantidad: number; precio?: number; precio_venta?: number; descuento?: number; imei?: string }>;
    }) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            // Normalizar payload (frontend puede enviar: { idtipopago, idcomprobante, detalles[] })
            const rawItems = Array.isArray(dto.items)
                ? dto.items
                : (Array.isArray(dto.detalles) ? dto.detalles : []);

            if (!rawItems.length) throw new BadRequestException('No hay items para la venta');

            // Caja: si no viene idcaja, tomar la sesión abierta del usuario
            let idcaja = dto.idcaja;
            if (!idcaja) {
                const sesion = await qr.manager
                    .getRepository(CajaSesion)
                    .createQueryBuilder('s')
                    .where('s.idusuario = :uid', { uid: dto.idusuario })
                    .andWhere("s.estado = 'Abierta'")
                    .orderBy('s.idp_caja', 'DESC')
                    .getOne();
                if (!sesion) throw new BadRequestException('No hay una caja abierta para registrar la venta');
                idcaja = sesion.idcaja;
            }

            // Tipo de pago
            let tipoPagoNombre = dto.tipo_pago;
            if (!tipoPagoNombre && dto.idtipopago) {
                const tipo = await qr.manager.findOne(TipoPago, { where: { idtipopago: dto.idtipopago } });
                tipoPagoNombre = tipo?.nombre;
            }

            // Tipo de comprobante
            let tipoComprobanteNombre = dto.tipo_comprobante;
            if (!tipoComprobanteNombre && dto.idcomprobante) {
                const comp = await qr.manager.findOne(CompPago, { where: { id_comp_pago: dto.idcomprobante } });
                tipoComprobanteNombre = comp?.nombre;
            }

            // Normalizar items y completar precio_compra desde Articulo cuando no venga
            const normalizedItems: ItemVenta[] = [];
            for (const item of rawItems as any[]) {
                const idarticulo = Number(item.idarticulo);
                const cantidad = Number(item.cantidad);
                if (!idarticulo || !Number.isFinite(cantidad) || cantidad <= 0) {
                    throw new BadRequestException('Detalle de venta inválido');
                }

                const articulo = await qr.manager.findOne(Articulo, { where: { idarticulo } });
                if (!articulo) throw new BadRequestException(`Artículo ${idarticulo} no existe`);

                const precioVenta = this.toNumber(item.precio_venta ?? item.precio ?? articulo.precio_venta);
                const precioCompra = this.toNumber(item.precio_compra ?? articulo.precio_compra ?? 0);
                const descuento = Number.isFinite(this.toNumber(item.descuento)) ? this.toNumber(item.descuento) : 0;

                if (!Number.isFinite(precioVenta)) throw new BadRequestException('Precio de venta inválido');
                if (!Number.isFinite(precioCompra)) throw new BadRequestException('Precio de compra inválido');

                normalizedItems.push({
                    idarticulo,
                    cantidad,
                    precio_compra: precioCompra,
                    precio_venta: precioVenta,
                    descuento,
                    imei: item.imei,
                });
            }

            // Total venta: si no viene en el payload, calcularlo
            const totalFromPayload = this.toNumber(dto.total_venta);
            const computedTotal = normalizedItems
                .reduce((s, i) => s + (Number(i.precio_venta) * Number(i.cantidad)) - (Number(i.descuento) || 0), 0);
            const totalVenta = Number.isFinite(totalFromPayload) ? totalFromPayload : computedTotal;
            if (!Number.isFinite(totalVenta)) throw new BadRequestException('Total de venta inválido');

            const impuesto = Number.isFinite(this.toNumber(dto.impuesto)) ? this.toNumber(dto.impuesto) : 0;

            // Auto-numeración de comprobante
            const lastVenta = tipoComprobanteNombre
                ? await this.ventaRepo.findOne({
                    where: { tipo_comprobante: tipoComprobanteNombre },
                    order: { idventa: 'DESC' },
                })
                : null;

            let serie = '001';
            let numero = '0000001';

            if (lastVenta?.num_comprobante) {
                const lastNum = parseInt(lastVenta.num_comprobante, 10);
                numero = String(lastNum + 1).padStart(7, '0');
                serie = lastVenta.serie_comprobante;
            } else if (tipoComprobanteNombre) {
                const comp = await this.compPagoRepo.findOne({
                    where: { nombre: tipoComprobanteNombre, condicion: 1 },
                });
                if (comp) {
                    serie = comp.serie_comprobante;
                    const n = parseInt(comp.num_comprobante ?? '1', 10);
                    numero = String(Number.isFinite(n) ? n : 1).padStart(7, '0');
                }
            }

            const idsucursal = dto.idsucursal;

            const venta = qr.manager.create(Venta, {
                idcliente: dto.idcliente || null,
                idusuario: dto.idusuario,
                idsucursal,
                tipo_comprobante: tipoComprobanteNombre ?? null,
                serie_comprobante: serie,
                num_comprobante: numero,
                fecha_hora: new Date(),
                impuesto,
                total_venta: totalVenta,
                tipo_pago: tipoPagoNombre ?? null,
                num_transac: dto.num_transac || null,
                estado: 'Aceptado',
                idcaja,
            });
            const savedVenta = await qr.manager.save(venta);

            for (const item of normalizedItems) {
                const detalle = qr.manager.create(DetalleVenta, {
                    idventa: savedVenta.idventa,
                    idarticulo: item.idarticulo,
                    cantidad: item.cantidad,
                    precio_compra: item.precio_compra,
                    precio_venta: item.precio_venta,
                    descuento: item.descuento || 0,
                    imei: item.imei,
                    estado: 1,
                });
                await qr.manager.save(detalle);

                // --- GESTION DE STOCK POR SUCURSAL ---
                let stockRecord = await qr.manager.findOne(ArticuloStock, {
                    where: { idarticulo: item.idarticulo, idsucursal },
                });

                if (!stockRecord) {
                    throw new BadRequestException(`No existe stock para el artículo ${item.idarticulo} en esta sucursal`);
                }
                if (stockRecord.stock < item.cantidad) {
                    throw new BadRequestException(`Stock insuficiente en sucursal para el artículo ${item.idarticulo}`);
                }

                const stockAnterior = stockRecord.stock;
                stockRecord.stock -= item.cantidad;
                await qr.manager.save(stockRecord);

                // --- REGISTRO DE KARDEX ---
                await qr.manager.save(InventarioMovimiento, {
                    idarticulo: item.idarticulo,
                    idsucursal,
                    idusuario: dto.idusuario,
                    tipo: 'VENTA',
                    idreferencia: savedVenta.idventa,
                    cantidad: -item.cantidad,
                    stock_anterior: stockAnterior,
                    stock_actual: stockRecord.stock,
                    motivo: `Venta comprobante ${serie}-${numero}`,
                    fecha: new Date(),
                });

                // Marcar IMEI como vendido
                if (item.imei) {
                    await qr.manager.update(
                        ArticuloImei,
                        { idarticulo: item.idarticulo, imei: item.imei },
                        { idventa: savedVenta.idventa },
                    );
                }
            }

            // Actualizar efectivo en caja si pago es Efectivo
            if (tipoPagoNombre?.toLowerCase().includes('efectivo')) {
                const sesion = await qr.manager.findOne(CajaSesion, {
                    where: { idcaja, estado: 'Abierta' },
                });
                if (sesion) {
                    await qr.manager.increment(
                        CajaSesion, { idp_caja: sesion.idp_caja },
                        'monto_ventas_efectivo', totalVenta,
                    );
                }
            }

            // Asiento contable automático
            await this.generarAsientoVenta(qr.manager, savedVenta.idventa, totalVenta, dto.idusuario);

            await qr.commitTransaction();
            return {
                idventa: savedVenta.idventa,
                message: 'Venta registrada correctamente',
                tipo_comprobante: savedVenta.tipo_comprobante,
                serie_comprobante: savedVenta.serie_comprobante,
                num_comprobante: savedVenta.num_comprobante,
                total: savedVenta.total_venta,
                tipo_pago: savedVenta.tipo_pago,
                fecha_hora: savedVenta.fecha_hora,
            };
        } catch (e) {
            await qr.rollbackTransaction();
            throw new BadRequestException('Error al registrar venta: ' + e.message);
        } finally {
            await qr.release();
        }
    }

    async anular(id: number, idusuario?: number) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
            const venta = await qr.manager.findOne(Venta, {
                where: { idventa: id },
                relations: ['detalles'],
            });
            if (!venta) throw new BadRequestException('Venta no encontrada');
            if (venta.estado === 'Anulado') throw new BadRequestException('La venta ya está anulada');

            // Restaurar stock por sucursal
            for (const d of venta.detalles) {
                let stockRecord = await qr.manager.findOne(ArticuloStock, {
                    where: { idarticulo: d.idarticulo, idsucursal: venta.idsucursal },
                });
                if (!stockRecord) {
                    stockRecord = qr.manager.create(ArticuloStock, {
                        idarticulo: d.idarticulo,
                        idsucursal: venta.idsucursal,
                        stock: 0,
                    });
                }
                const stockAnterior = stockRecord.stock;
                stockRecord.stock += d.cantidad;
                await qr.manager.save(stockRecord);

                // Kardex entrada por anulación
                await qr.manager.save(InventarioMovimiento, {
                    idarticulo: d.idarticulo,
                    idsucursal: venta.idsucursal,
                    idusuario: idusuario || venta.idusuario,
                    tipo: 'VENTA', // O podrías añadir 'ANULACION_VENTA' si prefieres, pero 'VENTA' con cantidad positiva ya indica devolución
                    idreferencia: venta.idventa,
                    cantidad: d.cantidad,
                    stock_anterior: stockAnterior,
                    stock_actual: stockRecord.stock,
                    motivo: `Anulación de venta ${venta.serie_comprobante}-${venta.num_comprobante}`,
                    fecha: new Date(),
                });

                if (d.imei) {
                    await qr.manager.update(ArticuloImei,
                        { idarticulo: d.idarticulo, imei: d.imei, idventa: venta.idventa },
                        { idventa: null }
                    );
                }
            }

            // Anular venta
            await qr.manager.update(Venta, id, { estado: 'Anulado' });

            // Anular asiento contable si existe
            await qr.manager.update(AsientoContable, { tipo_documento: 'venta', id_documento: id }, { condicion: 0 });

            await qr.commitTransaction();
            return { message: 'Venta anulada correctamente' };
        } catch (e) {
            await qr.rollbackTransaction();
            throw new BadRequestException('Error al anular venta: ' + e.message);
        } finally {
            await qr.release();
        }
    }

    private async generarAsientoVenta(manager: any, idventa: number, total: number, idusuario: number) {
        try {
            const caja = await this.cuentaRepo.findOne({ where: { codigo: '1010' } });
            const ingresos = await this.cuentaRepo.findOne({ where: { codigo: '4010' } });
            if (!caja || !ingresos) return;

            const now = new Date();
            const mes = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const count = await this.asientoRepo.count();
            const numero = `${year}${mes}-${String(count + 1).padStart(4, '0')}`;

            const asiento = manager.create(AsientoContable, {
                fecha: now,
                numero_asiento: numero,
                tipo_documento: 'venta',
                id_documento: idventa,
                descripcion: `Venta #${idventa}`,
                total_debe: total,
                total_haber: total,
                idusuario,
                idsucursal: (await manager.findOne(Venta, { where: { idventa } }))?.idsucursal,
                condicion: 1,
            });
            const savedAsiento = await manager.save(asiento);

            await manager.save(manager.create(DetalleAsiento, {
                idasiento: savedAsiento.idasiento, idcuenta: caja.idcuenta, debe: total, haber: 0,
            }));
            await manager.save(manager.create(DetalleAsiento, {
                idasiento: savedAsiento.idasiento, idcuenta: ingresos.idcuenta, debe: 0, haber: total,
            }));
        } catch { }
    }
}
