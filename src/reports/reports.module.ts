import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from '../entities/venta.entity';
import { DetalleVenta } from '../entities/detalle-venta.entity';
import { Ingreso } from '../entities/ingreso.entity';
import { DetalleIngreso } from '../entities/detalle-ingreso.entity';
import { Gasto } from '../entities/gasto.entity';
import { Persona } from '../entities/persona.entity';
import { Articulo } from '../entities/articulo.entity';
import { DatosNegocio } from '../entities/datos-negocio.entity';
import { Controller, Get, Query, Param, ParseIntPipe, UseGuards, Res, NotFoundException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Response } from 'express';
// pdfkit import moved to lazy-load inside methods
import { TemplatesService } from '../templates/templates.service';
import { TemplatesModule } from '../templates/templates.module';

@Injectable()
class ReportsService {
    constructor(
        @InjectRepository(Venta) private ventaRepo: Repository<Venta>,
        @InjectRepository(DetalleVenta) private dvRepo: Repository<DetalleVenta>,
        @InjectRepository(Ingreso) private ingresoRepo: Repository<Ingreso>,
        @InjectRepository(DetalleIngreso) private diRepo: Repository<DetalleIngreso>,
        @InjectRepository(Gasto) private gastoRepo: Repository<Gasto>,
        @InjectRepository(Persona) private personaRepo: Repository<Persona>,
        @InjectRepository(Articulo) private articuloRepo: Repository<Articulo>,
        @InjectRepository(DatosNegocio) private empresaRepo: Repository<DatosNegocio>,
    ) { }

    async getVentasPorFecha(inicio: string, fin: string) {
        return this.ventaRepo.createQueryBuilder('v')
            .leftJoinAndSelect('v.cliente', 'c')
            .leftJoinAndSelect('v.usuario', 'u')
            .where("v.estado = 'Aceptado' AND DATE(v.fecha_hora) BETWEEN :inicio AND :fin", { inicio, fin })
            .orderBy('v.fecha_hora', 'DESC')
            .getMany();
    }

    async getComprasPorFecha(inicio: string, fin: string) {
        return this.ingresoRepo.createQueryBuilder('i')
            .leftJoinAndSelect('i.proveedor', 'p')
            .leftJoinAndSelect('i.usuario', 'u')
            .where("i.estado = 'Aceptado' AND DATE(i.fecha_hora) BETWEEN :inicio AND :fin", { inicio, fin })
            .orderBy('i.fecha_hora', 'DESC')
            .getMany();
    }

    async getVentasPorArticulo(inicio: string, fin: string) {
        return this.dvRepo.createQueryBuilder('dv')
            .innerJoin('dv.venta', 'v')
            .innerJoin('dv.articulo', 'a')
            .select('a.nombre', 'nombre')
            .addSelect('SUM(dv.cantidad)', 'total_cantidad')
            .addSelect('SUM(dv.precio_venta * dv.cantidad)', 'total_venta')
            .where("v.estado = 'Aceptado' AND DATE(v.fecha_hora) BETWEEN :inicio AND :fin", { inicio, fin })
            .groupBy('a.idarticulo')
            .orderBy('total_venta', 'DESC')
            .getRawMany();
    }

    async getComprasPorArticulo(inicio: string, fin: string) {
        return this.diRepo.createQueryBuilder('di')
            .innerJoin('di.ingreso', 'i')
            .innerJoin('di.articulo', 'a')
            .select('a.nombre', 'nombre')
            .addSelect('SUM(di.cantidad)', 'total_cantidad')
            .addSelect('SUM(di.precio_compra * di.cantidad)', 'total_compra')
            .where("i.estado = 'Aceptado' AND DATE(i.fecha_hora) BETWEEN :inicio AND :fin", { inicio, fin })
            .groupBy('a.idarticulo')
            .orderBy('total_compra', 'DESC')
            .getRawMany();
    }

    async getVentaDetalle(id: number) {
        const venta = await this.ventaRepo.findOne({
            where: { idventa: id },
            relations: ['cliente', 'usuario', 'detalles', 'detalles.articulo', 'caja'],
        });
        const empresa = await this.empresaRepo.findOne({ where: { id_negocio: 1 } });
        return { venta, empresa };
    }

    async getArticulosReporte() {
        return this.articuloRepo.createQueryBuilder('a')
            .leftJoinAndSelect('a.categoria', 'c')
            .addSelect((sub) =>
                sub.select('di.precio_venta').from('detalle_ingreso', 'di')
                    .where('di.idarticulo = a.idarticulo').orderBy('di.iddetalle_ingreso', 'DESC').limit(1),
                'precio_venta',
            )
            .where('a.condicion = 1')
            .getMany();
    }
}

@Controller('reports')
@UseGuards(JwtAuthGuard)
class ReportsController {
    constructor(private svc: ReportsService, private templatesService: TemplatesService) { }

    @Get('ventas-fecha')
    getVentasFecha(@Query('inicio') ini: string, @Query('fin') fin: string) {
        return this.svc.getVentasPorFecha(ini, fin);
    }

    @Get('compras-fecha')
    getComprasFecha(@Query('inicio') ini: string, @Query('fin') fin: string) {
        return this.svc.getComprasPorFecha(ini, fin);
    }

    @Get('ventas-articulo')
    getVentasArticulo(@Query('inicio') ini: string, @Query('fin') fin: string) {
        return this.svc.getVentasPorArticulo(ini, fin);
    }

    @Get('compras-articulo')
    getComprasArticulo(@Query('inicio') ini: string, @Query('fin') fin: string) {
        return this.svc.getComprasPorArticulo(ini, fin);
    }

    @Get('venta/:id')
    getVentaDetalle(@Param('id', ParseIntPipe) id: number) {
        return this.svc.getVentaDetalle(id);
    }

    @Get('articulos')
    getArticulos() { return this.svc.getArticulosReporte(); }

    @Get('ticket/:id')
    async getTicketPdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const { venta, empresa } = await this.svc.getVentaDetalle(id);
        if (!venta) throw new NotFoundException('Venta no encontrada');

        // PDF generation using PDFKit (Puppeteer was removed for shared hosting compatibility)

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="venta-${id}.pdf"`);

        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        doc.pipe(res);

        const simbolo = (empresa as any)?.simbolo ?? 'S/';
        const fmt = (n: any) => `${simbolo} ${Number(n ?? 0).toFixed(2)}`;

        // Header
        doc.fontSize(16).text((empresa as any)?.nombre ?? 'Comprobante', { align: 'center' });
        doc.moveDown(0.25);
        const ruc = (empresa as any)?.ndocumento ? `RUC: ${(empresa as any)?.ndocumento}` : '';
        const dir = (empresa as any)?.direccion ? `Dirección: ${(empresa as any)?.direccion}` : '';
        if (ruc) doc.fontSize(10).text(ruc, { align: 'center' });
        if (dir) doc.fontSize(10).text(dir, { align: 'center' });
        doc.moveDown(1);

        // Comprobante info
        const tipo = (venta as any)?.tipo_comprobante ?? 'Comprobante';
        const serie = (venta as any)?.serie_comprobante ?? '';
        const num = (venta as any)?.num_comprobante ?? '';
        doc.fontSize(12).text(`${tipo}`, { align: 'center' });
        doc.fontSize(12).text(`${serie}-${num}`, { align: 'center' });
        doc.moveDown(1);

        const formatLocalDateTime = (d: Date) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const hh = String(d.getHours()).padStart(2, '0');
            const mi = String(d.getMinutes()).padStart(2, '0');
            const ss = String(d.getSeconds()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
        };
        const fecha = (venta as any)?.fecha_hora ? formatLocalDateTime(new Date((venta as any).fecha_hora)) : '';
        doc.fontSize(10);
        doc.text(`Fecha: ${fecha}`);
        doc.text(`Cliente: ${(venta as any)?.cliente ? `${(venta as any).cliente?.nombre ?? ''} ${(venta as any).cliente?.apellidos ?? ''}`.trim() : 'Consumidor final'}`);
        doc.text(`Pago: ${(venta as any)?.tipo_pago ?? '-'}`);
        if ((venta as any)?.num_transac) doc.text(`N° Operación: ${(venta as any).num_transac}`);
        doc.moveDown(0.75);

        // Items
        doc.fontSize(10).text('Detalle', { underline: true });
        doc.moveDown(0.25);

        const startX = doc.x;
        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

        const colCant = 50;
        const colPrecio = 80;
        const colTotal = 90;
        const colNombre = pageWidth - colCant - colPrecio - colTotal;

        const y0 = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('Cant', startX, y0, { width: colCant });
        doc.text('Producto', startX + colCant, y0, { width: colNombre });
        doc.text('P. Unit', startX + colCant + colNombre, y0, { width: colPrecio, align: 'right' });
        doc.text('Importe', startX + colCant + colNombre + colPrecio, y0, { width: colTotal, align: 'right' });
        doc.font('Helvetica');
        doc.moveDown(0.4);

        const detalles = ((venta as any)?.detalles ?? []) as any[];
        for (const d of detalles) {
            const nombre = d?.articulo?.nombre ?? '';
            const cant = Number(d?.cantidad ?? 0);
            const precio = Number(d?.precio_venta ?? 0);
            const desc = Number(d?.descuento ?? 0);
            const importe = (precio * cant) - (desc || 0);

            const y = doc.y;
            doc.text(String(cant), startX, y, { width: colCant });
            doc.text(nombre, startX + colCant, y, { width: colNombre });
            doc.text(Number(precio).toFixed(2), startX + colCant + colNombre, y, { width: colPrecio, align: 'right' });
            doc.text(Number(importe).toFixed(2), startX + colCant + colNombre + colPrecio, y, { width: colTotal, align: 'right' });
            doc.moveDown(0.2);
        }

        doc.moveDown(0.75);
        doc.font('Helvetica-Bold');
        doc.text(`TOTAL: ${fmt((venta as any)?.total_venta)}`, { align: 'right' });
        doc.font('Helvetica');
        doc.moveDown(1);
        doc.fontSize(9).fillColor('#666').text('Gracias por su compra', { align: 'center' });
        doc.fillColor('#000');

        doc.end();
    }
}

@Module({
    imports: [TypeOrmModule.forFeature([Venta, DetalleVenta, Ingreso, DetalleIngreso, Gasto, Persona, Articulo, DatosNegocio]), TemplatesModule],
    controllers: [ReportsController],
    providers: [ReportsService],
})
export class ReportsModule { }
