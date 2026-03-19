import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Articulo } from '../entities/articulo.entity';
import { ArticuloImei } from '../entities/articulo-imei.entity';
import { ArticuloStock } from '../entities/articulo-stock.entity';

function toNumber(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
        const n = Number(value.replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    }
    return 0;
}

@Injectable()
export class ProductsService {
    constructor(
        @InjectRepository(Articulo) private repo: Repository<Articulo>,
        @InjectRepository(ArticuloImei) private imeiRepo: Repository<ArticuloImei>,
        @InjectRepository(ArticuloStock) private stockRepo: Repository<ArticuloStock>,
    ) { }

    private parseBool(value: unknown): number {
        if (typeof value === 'boolean') return value ? 1 : 0;
        if (typeof value === 'number') return value ? 1 : 0;
        const s = String(value ?? '').trim().toLowerCase();
        if (['1', 'true', 'on', 'yes', 'si', 'sí'].includes(s)) return 1;
        return 0;
    }

    private parseImeis(dto: any): string[] {
        const raw = dto?.imeis;
        let items: string[] = [];

        if (Array.isArray(raw)) {
            items = raw.map((x) => String(x ?? ''));
        } else if (typeof raw === 'string') {
            const s = raw.trim();
            if (!s) items = [];
            else if (s.startsWith('[')) {
                try {
                    const parsed = JSON.parse(s);
                    if (Array.isArray(parsed)) items = parsed.map((x) => String(x ?? ''));
                    else items = [s];
                } catch {
                    items = s.split(/\r?\n|,|;/g);
                }
            } else {
                items = s.split(/\r?\n|,|;/g);
            }
        } else {
            items = [];
        }

        const cleaned = items
            .map((x) => String(x ?? '').trim())
            .filter(Boolean);

        const seen = new Set<string>();
        const out: string[] = [];
        for (const imei of cleaned) {
            const key = imei.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(imei);
        }
        return out;
    }

    async findAll(idsucursal?: number) {
        const qb = this.repo.createQueryBuilder('a')
            .leftJoinAndSelect('a.categoria', 'c')
            .leftJoinAndSelect('a.imeis', 'i', 'i.idventa IS NULL')
            .leftJoin(
                (sub) =>
                    sub
                        .select('d.idarticulo', 'idarticulo')
                        .addSelect('MAX(d.iddetalle_ingreso)', 'maxid')
                        .from('detalle_ingreso', 'd')
                        .groupBy('d.idarticulo'),
                'last',
                'last.idarticulo = a.idarticulo',
            )
            .leftJoin('detalle_ingreso', 'di', 'di.iddetalle_ingreso = last.maxid')
            .addSelect('COALESCE(di.precio_compra, a.precio_compra)', 'precio_compra')
            .addSelect('COALESCE(NULLIF(di.precio_venta, 0), a.precio_venta)', 'precio_venta');

        if (idsucursal) {
            qb.leftJoin('a.stocks', 's', 's.idsucursal = :idsucursal', { idsucursal })
                .addSelect('COALESCE(s.stock, 0)', 'stock');
        } else {
            qb.addSelect('0', 'stock');
        }

        qb.orderBy('a.idarticulo', 'DESC');

        const { entities, raw } = await qb.getRawAndEntities();
        return entities.map((a, idx) => ({
            ...a,
            stock: toNumber(raw[idx]?.stock),
            precio_compra: toNumber(raw[idx]?.precio_compra ?? (a as any).precio_compra),
            precio_venta: toNumber(raw[idx]?.precio_venta ?? (a as any).precio_venta),
        }));
    }

    async findActivos(idsucursal?: number) {
        const qb = this.repo.createQueryBuilder('a')
            .leftJoinAndSelect('a.categoria', 'c')
            .leftJoinAndSelect('a.imeis', 'i', 'i.idventa IS NULL')
            .leftJoin(
                (sub) =>
                    sub
                        .select('d.idarticulo', 'idarticulo')
                        .addSelect('MAX(d.iddetalle_ingreso)', 'maxid')
                        .from('detalle_ingreso', 'd')
                        .groupBy('d.idarticulo'),
                'last',
                'last.idarticulo = a.idarticulo',
            )
            .leftJoin('detalle_ingreso', 'di', 'di.iddetalle_ingreso = last.maxid')
            .addSelect('COALESCE(di.precio_compra, a.precio_compra)', 'precio_compra')
            .addSelect('COALESCE(NULLIF(di.precio_venta, 0), a.precio_venta)', 'precio_venta')
            .where('a.condicion = 1');

        if (idsucursal) {
            qb.leftJoin('a.stocks', 's', 's.idsucursal = :idsucursal', { idsucursal })
                .addSelect('COALESCE(s.stock, 0)', 'stock');
        } else {
            qb.addSelect('0', 'stock');
        }

        qb.orderBy('a.idarticulo', 'DESC');

        const { entities, raw } = await qb.getRawAndEntities();
        return entities.map((a, idx) => ({
            ...a,
            stock: toNumber(raw[idx]?.stock),
            precio_compra: toNumber(raw[idx]?.precio_compra ?? (a as any).precio_compra),
            precio_venta: toNumber(raw[idx]?.precio_venta ?? (a as any).precio_venta),
        }));
    }

    async findActivosConStock(idsucursal: number) {
        const qb = this.repo.createQueryBuilder('a')
            .innerJoin('a.stocks', 's', 's.idsucursal = :idsucursal AND s.stock > 0', { idsucursal })
            .leftJoinAndSelect('a.categoria', 'c')
            .leftJoinAndSelect('a.imeis', 'i', 'i.idventa IS NULL')
            .addSelect('s.stock', 'stock')
            .leftJoin(
                (sub) =>
                    sub
                        .select('d.idarticulo', 'idarticulo')
                        .addSelect('MAX(d.iddetalle_ingreso)', 'maxid')
                        .from('detalle_ingreso', 'd')
                        .groupBy('d.idarticulo'),
                'last',
                'last.idarticulo = a.idarticulo',
            )
            .leftJoin('detalle_ingreso', 'di', 'di.iddetalle_ingreso = last.maxid')
            .addSelect('COALESCE(di.precio_compra, a.precio_compra)', 'precio_compra')
            .addSelect('COALESCE(NULLIF(di.precio_venta, 0), a.precio_venta)', 'precio_venta')
            .where('a.condicion = 1')
            .orderBy('a.idarticulo', 'DESC');

        const { entities, raw } = await qb.getRawAndEntities();
        return entities.map((a, idx) => ({
            ...a,
            stock: toNumber(raw[idx]?.stock),
            precio_compra: toNumber(raw[idx]?.precio_compra ?? (a as any).precio_compra),
            precio_venta: toNumber(raw[idx]?.precio_venta ?? (a as any).precio_venta),
        }));
    }

    findOne(id: number) {
        return this.repo.findOne({ where: { idarticulo: id }, relations: ['categoria', 'imeis', 'proveedor'] });
    }

    async create(dto: any, imagen?: string) {
        const esTelefono = this.parseBool(dto?.es_telefono ?? dto?.esTelefono);
        const imeis = this.parseImeis(dto);

        const dtoClean = { ...(dto ?? {}) };
        delete (dtoClean as any).imeis;

        const art = (this.repo.create({
            ...dtoClean,
            idproveedor: dto.idproveedor ? toNumber(dto.idproveedor) : null,
            es_telefono: esTelefono,
            imagen: imagen || null,
            condicion: 1,
        } as any) as unknown) as Articulo;
        const saved = (await this.repo.save(art)) as Articulo;

        if (esTelefono && imeis.length > 0) {
            const existing = await this.imeiRepo.find({ where: imeis.map((imei) => ({ imei })) });
            if (existing.length > 0) {
                throw new BadRequestException(`IMEI ya existe: ${existing.map((e) => e.imei).join(', ')}`);
            }
            await this.imeiRepo.insert(imeis.map((imei) => ({ idarticulo: saved.idarticulo, imei })));
        }

        return this.findOne(saved.idarticulo);
    }

    async update(id: number, dto: any, imagen?: string) {
        const esTelefono = this.parseBool(dto?.es_telefono ?? dto?.esTelefono);
        const imeis = this.parseImeis(dto);

        const dtoClean = { ...(dto ?? {}) };
        delete (dtoClean as any).imeis;

        const updates: Partial<Articulo> = {
            ...dtoClean,
            idproveedor: dto.idproveedor ? toNumber(dto.idproveedor) : null,
            es_telefono: esTelefono
        };
        if (imagen) updates.imagen = imagen;
        await this.repo.update(id, updates);

        if (!esTelefono) {
            await this.imeiRepo.delete({ idarticulo: id });
            return { message: 'Artículo actualizado' };
        }

        const existing = imeis.length > 0
            ? await this.imeiRepo
                .createQueryBuilder('i')
                .where('i.imei IN (:...imeis)', { imeis })
                .andWhere('i.idarticulo <> :idarticulo', { idarticulo: id })
                .getMany()
            : [];
        if (existing.length > 0) {
            throw new BadRequestException(`IMEI ya existe: ${existing.map((e) => e.imei).join(', ')}`);
        }

        await this.imeiRepo.delete({ idarticulo: id });
        if (imeis.length > 0) {
            await this.imeiRepo.insert(imeis.map((imei) => ({ idarticulo: id, imei })));
        }

        return { message: 'Artículo actualizado' };
    }

    async deactivate(id: number) {
        await this.repo.update(id, { condicion: 0 });
        return { message: 'Artículo desactivado' };
    }

    async activate(id: number) {
        await this.repo.update(id, { condicion: 1 });
        return { message: 'Artículo activado' };
    }

    async validateStock(id: number, idsucursal: number) {
        const stockRecord = await this.stockRepo.findOne({ where: { idarticulo: id, idsucursal } });
        return { stock: stockRecord?.stock || 0 };
    }

    async decreaseStock(id: number, cantidad: number, idsucursal: number) {
        await this.stockRepo.decrement({ idarticulo: id, idsucursal }, 'stock', cantidad);
        return { ok: true };
    }

    async increaseStock(id: number, cantidad: number, idsucursal: number) {
        await this.stockRepo.increment({ idarticulo: id, idsucursal }, 'stock', cantidad);
        return { ok: true };
    }
}
