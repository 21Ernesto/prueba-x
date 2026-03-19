import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlantillaComprobante, PlantillaTipo } from '../entities/plantilla-comprobante.entity';
import { DatosNegocio } from '../entities/datos-negocio.entity';
import { Venta } from '../entities/venta.entity';
import { CompPago } from '../entities/comp-pago.entity';
import { Cotizacion } from '../entities/cotizacion.entity';
import { DetalleCotizacion } from '../entities/detalle-cotizacion.entity';
import { TipoPago } from '../entities/tipo-pago.entity';

// Lazy imports for heavy deps (avoid loading on cold paths)
let handlebars: typeof import('handlebars') | null = null;
let puppeteer: typeof import('puppeteer') | null = null;

function formatLocalDate(d?: Date | null) {
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatLocalDateTime(d?: Date | null) {
    if (!d) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function toNumber(value: unknown) {
    const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
    return Number.isFinite(n) ? n : 0;
}

@Injectable()
export class TemplatesService {
    constructor(
        @InjectRepository(PlantillaComprobante) private repo: Repository<PlantillaComprobante>,
        @InjectRepository(DatosNegocio) private empresaRepo: Repository<DatosNegocio>,
        @InjectRepository(Venta) private ventaRepo: Repository<Venta>,
        @InjectRepository(CompPago) private compRepo: Repository<CompPago>,
        @InjectRepository(Cotizacion) private cotizacionRepo: Repository<Cotizacion>,
        @InjectRepository(TipoPago) private tipoPagoRepo: Repository<TipoPago>,
    ) { }

    findAll() {
        return this.repo.find({ order: { idplantilla: 'DESC' } as any });
    }

    async findOne(id: number) {
        const t = await this.repo.findOne({ where: { idplantilla: id } });
        if (!t) throw new NotFoundException('Plantilla no encontrada');
        return t;
    }

    async create(data: Partial<PlantillaComprobante>) {
        const created = this.repo.create({
            nombre: data.nombre,
            idcomprobante: data.idcomprobante ?? null,
            idtipopago: data.idtipopago ?? null,
            tipo: (data.tipo ?? 'TICKET') as PlantillaTipo,
            html: data.html,
            activo: data.activo ?? 1,
        } as any);
        return this.repo.save(created);
    }

    async update(id: number, data: Partial<PlantillaComprobante>) {
        const t = await this.findOne(id);
        const patch: any = { ...data };
        if (patch.idcomprobante === undefined) delete patch.idcomprobante;
        if (patch.idtipopago === undefined) delete patch.idtipopago;
        await this.repo.update(t.idplantilla, patch);
        return this.findOne(id);
    }

    async setActive(id: number, activo: number) {
        const t = await this.findOne(id);
        await this.repo.update(t.idplantilla, { activo });
        return this.findOne(id);
    }

    async findBestTemplate(idcomprobante?: number | null, idtipopago?: number | null, tipoFallback: PlantillaTipo = 'TICKET') {
        if (idcomprobante && idtipopago) {
            // Priority 1: Specific for voucher AND payment type
            const vpt = await this.repo.findOne({
                where: { idcomprobante, idtipopago, activo: 1 } as any,
                order: { idplantilla: 'DESC' } as any,
            });
            if (vpt) return vpt;
        }

        if (idcomprobante) {
            // Priority 2: Specific for voucher
            const specific = await this.repo.findOne({
                where: { idcomprobante, idtipopago: null, activo: 1 } as any,
                order: { idplantilla: 'DESC' } as any,
            });
            if (specific) return specific;
        }

        if (idtipopago) {
            // Priority 3: Specific for payment type
            const paymentOnly = await this.repo.findOne({
                where: { idtipopago, idcomprobante: null, activo: 1 } as any,
                order: { idplantilla: 'DESC' } as any,
            });
            if (paymentOnly) return paymentOnly;
        }

        // Priority 4: Global template of the requested fallback type
        const global = await this.repo.findOne({
            where: { tipo: tipoFallback, idcomprobante: null, idtipopago: null, activo: 1 } as any,
            order: { idplantilla: 'DESC' } as any,
        });
        if (global) return global;

        // Priority 5: Any global active template
        return this.repo.findOne({
            where: { idcomprobante: null, idtipopago: null, activo: 1 } as any,
            order: { idplantilla: 'DESC' } as any,
        });
    }

    private async getContext(ventaId: number | undefined, originUrl: string, cajaSesionId?: number, cotizacionId?: number) {
        const empresa = await this.empresaRepo.findOne({ where: { id_negocio: 1 } });
        const simbolo = (empresa as any)?.simbolo ?? '$';
        const fmt = (n: any, decimals = 2) => `${simbolo} ${toNumber(n).toFixed(decimals)}`;

        if (cajaSesionId) {
            const sesion = await this.repo.manager.getRepository('CajaSesion').findOne({
                where: { idp_caja: cajaSesionId },
                relations: ['caja', 'usuario', 'movimientos'],
            } as any);
            
            if (sesion) {
                const totalEsperado = toNumber(sesion.monto_apertura) + toNumber(sesion.monto_ventas_efectivo) + toNumber(sesion.monto_ingresos_manual) - toNumber(sesion.monto_egresos_manual);
                const diferencia = (sesion.monto_cierre_real !== null) ? Number(sesion.monto_cierre_real) - totalEsperado : 0;

                return {
                    empresa: {
                        ...(empresa as any),
                        logo_url: (empresa as any)?.logo ? `${originUrl}/uploads/company/${(empresa as any)?.logo}` : null,
                    },
                    sesion: {
                        ...(sesion as any),
                        fecha_apertura_fmt: formatLocalDateTime(sesion.fecha_apertura),
                        fecha_cierre_fmt: formatLocalDateTime(sesion.fecha_cierre),
                        monto_apertura_fmt: fmt(sesion.monto_apertura),
                        monto_ventas_efectivo_fmt: fmt(sesion.monto_ventas_efectivo),
                        monto_ingresos_manual_fmt: fmt(sesion.monto_ingresos_manual),
                        monto_egresos_manual_fmt: fmt(sesion.monto_egresos_manual),
                        monto_cierre_real_fmt: fmt(sesion.monto_cierre_real),
                        monto_cierre_esperado_fmt: fmt(totalEsperado),
                        diferencia_fmt: fmt(diferencia),
                        es_abierta: !sesion.fecha_cierre,
                    },
                    detalles: (sesion.movimientos || []).map((m: any) => ({
                        ...m,
                        fecha_hora_fmt: formatLocalDateTime(m.fecha_hora),
                        monto_fmt: fmt(m.monto),
                        es_ingreso: m.tipo === 'Ingreso',
                    })),
                    moneda: { simbolo },
                };
            }
        }

        if (!ventaId && !cotizacionId) {
            return {
                empresa: {
                    ...(empresa as any),
                    logo_url: (empresa as any)?.logo ? `${originUrl}/uploads/company/${(empresa as any)?.logo}` : null,
                },
                venta: null,
                comprobante: null,
                cliente: null,
                usuario: null,
                detalles: [],
                moneda: { simbolo },
            };
        }

        if (cotizacionId) {
            const cot = await this.cotizacionRepo.findOne({
                where: { idcotizacion: cotizacionId },
                relations: ['cliente', 'usuario', 'detalles', 'detalles.articulo', 'comprobante'],
            });
            if (!cot) throw new NotFoundException('Cotización no encontrada');

            const detailsMapped = (cot.detalles ?? []).map((d: any) => {
                const subtotal = (toNumber(d.precio_venta) * toNumber(d.cantidad)) - toNumber(d.descuento);
                return {
                    ...d,
                    articulo: d.articulo,
                    subtotal,
                    subtotal_fmt: fmt(subtotal),
                    precio_venta_fmt: fmt(d.precio_venta),
                    descuento_fmt: fmt(d.descuento),
                    imei: d.imei,
                };
            });

            const cotMapped = {
                ...cot,
                fecha: formatLocalDate(cot.fecha_hora),
                fecha_hora_fmt: formatLocalDateTime(cot.fecha_hora),
                total_fmt: fmt(cot.total),
                total_venta: cot.total, // Alias for compatibility
                total_venta_fmt: fmt(cot.total), // Alias for compatibility
                impuesto_fmt: fmt(cot.impuesto),
            };

            return {
                empresa: {
                    ...(empresa as any),
                    logo_url: (empresa as any)?.logo ? `${originUrl}/uploads/company/${(empresa as any)?.logo}` : null,
                },
                cotizacion: cotMapped,
                venta: cotMapped, // Map to venta for compatibility with sales templates
                comprobante: {
                    nombre: cot.comprobante?.nombre ?? 'Cotización',
                    serie: cot.serie_comprobante,
                    numero: cot.num_comprobante,
                },
                cliente: cot.cliente,
                usuario: cot.usuario,
                detalles: detailsMapped,
                moneda: { simbolo },
            };
        }

        const venta = await this.ventaRepo.findOne({
            where: { idventa: ventaId },
            relations: ['cliente', 'usuario', 'detalles', 'detalles.articulo'],
        });
        if (!venta) throw new NotFoundException('Venta no encontrada');

        const detalles = (venta.detalles || []).map((d: any) => {
            const subtotal = (toNumber(d.precio_venta) * toNumber(d.cantidad)) - toNumber(d.descuento);
            return {
                ...d,
                articulo: d.articulo,
                subtotal,
                subtotal_fmt: fmt(subtotal),
                precio_venta_fmt: fmt(d.precio_venta),
                descuento_fmt: fmt(d.descuento),
                imei: d.imei,
            };
        });

        return {
            empresa: {
                ...(empresa as any),
                logo_url: (empresa as any)?.logo ? `${originUrl}/uploads/company/${(empresa as any)?.logo}` : null,
            },
            venta: {
                ...venta,
                fecha: formatLocalDate(venta.fecha_hora),
                fecha_hora_fmt: formatLocalDateTime(venta.fecha_hora),
                total_venta_fmt: fmt(venta.total_venta),
                impuesto_fmt: fmt(venta.impuesto),
                moneda: simbolo,
            },
            comprobante: {
                nombre: venta.tipo_comprobante,
                serie: venta.serie_comprobante,
                numero: venta.num_comprobante,
            },
            cliente: venta.cliente,
            usuario: venta.usuario,
            detalles,
            moneda: { simbolo },
        };
    }

    async renderHtml(html: string, ventaId: number | undefined, originUrl: string, cajaSesionId?: number, cotizacionId?: number) {
        if (!handlebars) handlebars = await import('handlebars');
        const ctx = await this.getContext(ventaId, originUrl, cajaSesionId, cotizacionId);
        const tpl = handlebars.compile(html, { strict: false, noEscape: false });
        return tpl(ctx);
    }

    async renderPdfFromHtml(html: string, tipo: PlantillaTipo, ventaId: number | undefined, originUrl: string, cajaSesionId?: number, cotizacionId?: number) {
        if (!puppeteer) puppeteer = await import('puppeteer');

        let browser: any = null;
        try {
            const rendered = await this.renderHtml(html, ventaId, originUrl, cajaSesionId, cotizacionId);
            console.log(`[TemplatesService] HTML rendered (${rendered.length} bytes) for ${cotizacionId ? 'cot:' + cotizacionId : 'venta:' + ventaId}`);

            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
            console.log('[TemplatesService] Puppeteer launched');

            const page = await browser.newPage();
            console.log('[TemplatesService] New page created');
            
            // await page.setJavaScriptEnabled(false); 
            await page.setContent(rendered, { waitUntil: 'load', timeout: 30000 });
            console.log('[TemplatesService] Page content set');

            const pdfOptions: any = {
                printBackground: true,
                margin: { top: '6mm', right: '6mm', bottom: '6mm', left: '6mm' },
            };

            if (tipo === 'TICKET') {
                pdfOptions.width = '80mm';
                pdfOptions.height = '297mm';
            } else {
                pdfOptions.format = 'A4';
            }

            console.log('[TemplatesService] Generating PDF...');
            const buf = await page.pdf(pdfOptions);
            console.log(`[TemplatesService] PDF generated (${buf.length} bytes)`);
            return Buffer.from(buf);
        } catch (err) {
            console.error('[TemplatesService] CRITICAL Error in renderPdfFromHtml:', err.message, err.stack);
            throw err;
        } finally {
            if (browser) await browser.close();
        }
    }

    async renderPdfFromTemplate(templateId: number, ventaId: number | undefined, originUrl: string) {
        const t = await this.findOne(templateId);
        return this.renderPdfFromHtml(t.html, t.tipo, ventaId, originUrl);
    }

    async renderBestTemplateForVenta(ventaId: number, originUrl: string) {
        const venta = await this.ventaRepo.findOne({ where: { idventa: ventaId } });
        if (!venta) throw new NotFoundException('Venta no encontrada');

        const comp = venta.tipo_comprobante
            ? await this.compRepo.findOne({ where: { nombre: venta.tipo_comprobante } as any })
            : null;

        const pago = venta.tipo_pago
            ? await this.tipoPagoRepo.findOne({ where: { nombre: venta.tipo_pago } as any })
            : null;

        const t = await this.findBestTemplate(comp?.id_comp_pago ?? null, pago?.idtipopago ?? null);
        if (!t) return null;
        const pdf = await this.renderPdfFromHtml(t.html, t.tipo, ventaId, originUrl);
        return { template: t, pdf };
    }

    async renderBestTemplateForCotizacion(cotizacionId: number, originUrl: string, idcomprobante?: number | null) {
        // Try COTIZACION first (with voucher if provided), then A4, then TICKET
        let t = await this.findBestTemplate(idcomprobante, null, 'COTIZACION');
        if (!t) t = await this.findBestTemplate(idcomprobante, null, 'A4');
        if (!t) t = await this.findBestTemplate(idcomprobante, null, 'TICKET');
        
        if (!t) return null;
        const pdf = await this.renderPdfFromHtml(t.html, t.tipo, undefined, originUrl, undefined, cotizacionId);
        return { template: t, pdf };
    }

    async renderClosurePdf(idp_caja: number, originUrl: string) {
        const t = await this.repo.findOne({
            where: { tipo: 'CUADRE', activo: 1 } as any,
            order: { idplantilla: 'DESC' } as any,
        });
        if (!t) return null;

        const pdf = await this.renderPdfFromHtml(t.html, t.tipo, undefined, originUrl, idp_caja);
        return { template: t, pdf };
    }
}
