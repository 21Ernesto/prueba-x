import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Cotizacion } from '../entities/cotizacion.entity';
import { DetalleCotizacion } from '../entities/detalle-cotizacion.entity';
import { Articulo } from '../entities/articulo.entity';
import { CompPago } from '../entities/comp-pago.entity';
import { SalesService } from '../sales/sales.service';
import { TemplatesService } from '../templates/templates.service';

@Injectable()
export class QuotationsService {
    constructor(
        @InjectRepository(Cotizacion) private cotizacionRepo: Repository<Cotizacion>,
        @InjectRepository(DetalleCotizacion) private detalleRepo: Repository<DetalleCotizacion>,
        @InjectRepository(Articulo) private articuloRepo: Repository<Articulo>,
        @InjectRepository(CompPago) private compPagoRepo: Repository<CompPago>,
        private salesService: SalesService,
        private templatesService: TemplatesService,
        private dataSource: DataSource,
    ) { }

    async findAll(fecha_inicio?: string, fecha_fin?: string, idsucursal?: number) {
        const qb = this.cotizacionRepo.createQueryBuilder('q')
            .leftJoinAndSelect('q.cliente', 'c')
            .leftJoinAndSelect('q.usuario', 'u')
            .orderBy('q.idcotizacion', 'DESC');

        if (idsucursal) {
            qb.andWhere('q.idsucursal = :sid', { sid: idsucursal });
        }
        if (fecha_inicio) {
            qb.andWhere('DATE(q.fecha_hora) >= :fi', { fi: fecha_inicio });
        }
        if (fecha_fin) {
            qb.andWhere('DATE(q.fecha_hora) <= :ff', { ff: fecha_fin });
        }
        return qb.getMany();
    }

    async findOne(id: number) {
        return this.cotizacionRepo.findOne({
            where: { idcotizacion: id },
            relations: ['cliente', 'usuario', 'detalles', 'detalles.articulo'],
        });
    }

    async create(dto: any) {
        const qr = this.dataSource.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();

        try {
            const detalles = dto.detalles || [];
            if (!detalles.length) throw new BadRequestException('No hay items para la cotización');

            // Auto-numeración basada en CompPago
            let serie = 'COT';
            let numero = '0000001';

            if (dto.idcomprobante) {
                const comp = await qr.manager.findOne(CompPago, { where: { id_comp_pago: dto.idcomprobante } });
                if (comp) {
                    serie = comp.serie_comprobante;
                    const nextNum = parseInt(comp.num_comprobante, 10) + 1;
                    numero = String(nextNum).padStart(comp.num_comprobante.length, '0');
                    // Actualizar el correlativo en el comprobante
                    await qr.manager.update(CompPago, comp.id_comp_pago, { num_comprobante: numero });
                }
            } else {
                const last = await this.cotizacionRepo.findOne({
                    where: {},
                    order: { idcotizacion: 'DESC' },
                });
                if (last?.num_comprobante) {
                    const lastNum = parseInt(last.num_comprobante, 10);
                    numero = String(lastNum + 1).padStart(7, '0');
                }
            }

            const cotizacion = qr.manager.create(Cotizacion, {
                idcliente: dto.idcliente || null,
                idusuario: dto.idusuario,
                idsucursal: dto.idsucursal,
                idcomprobante: dto.idcomprobante || null,
                serie_comprobante: serie,
                num_comprobante: numero,
                fecha_hora: new Date(),
                impuesto: dto.impuesto || 0,
                total: dto.total || 0,
                validez_dias: dto.validez_dias || 5,
                estado: 'Pendiente',
            });

            const saved = await qr.manager.save(cotizacion);

            for (const item of detalles) {
                const det = qr.manager.create(DetalleCotizacion, {
                    idcotizacion: saved.idcotizacion,
                    idarticulo: item.idarticulo,
                    cantidad: item.cantidad,
                    precio_venta: item.precio,
                    descuento: item.descuento || 0,
                    imei: item.imei,
                });
                await qr.manager.save(det);
            }

            await qr.commitTransaction();
            return saved;
        } catch (e) {
            await qr.rollbackTransaction();
            throw new BadRequestException('Error al crear cotización: ' + e.message);
        } finally {
            await qr.release();
        }
    }

    async annul(id: number) {
        await this.cotizacionRepo.update(id, { estado: 'Anulada' });
        return { message: 'Cotización anulada' };
    }

    async convertToSale(id: number, idusuario: number, dto: any = {}) {
        const quotation = await this.findOne(id);
        if (!quotation) throw new BadRequestException('Cotización no encontrada');
        if (quotation.estado === 'Aceptada') throw new BadRequestException('Esta cotización ya ha sido procesada como venta');

        // Validar Stock por sucursal
        for (const item of quotation.detalles) {
            const stockRecord = await this.dataSource.getRepository('ArticuloStock').findOne({
                where: { idarticulo: item.idarticulo, idsucursal: quotation.idsucursal }
            }) as any;
            const stock = stockRecord?.stock ?? 0;
            if (stock < item.cantidad) {
                throw new BadRequestException(`Stock insuficiente en sucursal para el producto: ${item.articulo.nombre}. Disponible: ${stock}, Requerido: ${item.cantidad}`);
            }
        }

        // Crear Venta
        const sale = await this.salesService.create({
            idcliente: dto.idcliente || quotation.idcliente,
            idusuario: idusuario,
            idsucursal: quotation.idsucursal,
            idtipopago: dto.idtipopago || 1,
            idcomprobante: dto.idcomprobante || 1,
            num_transac: dto.num_transac,
            impuesto: quotation.impuesto,
            total_venta: quotation.total,
            items: quotation.detalles.map(d => ({
                idarticulo: d.idarticulo,
                cantidad: d.cantidad,
                precio_venta: d.precio_venta,
                precio_compra: d.articulo.precio_compra,
                descuento: d.descuento || 0,
            } as any)),
        });

        // Actualizar estado de la cotización
        await this.cotizacionRepo.update(id, { estado: 'Aceptada' });

        return sale;
    }

    async renderPdf(id: number, originUrl: string) {
        const cot = await this.findOne(id);
        if (!cot) return null;
        return this.templatesService.renderBestTemplateForCotizacion(id, originUrl, cot.idcomprobante);
    }
}
