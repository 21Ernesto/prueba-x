import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoPago } from '../entities/tipo-pago.entity';
import { CompPago } from '../entities/comp-pago.entity';
import { DatosNegocio } from '../entities/datos-negocio.entity';
import { Controller, Get, Post, Put, Patch, Delete, Body, Param, ParseIntPipe, UseGuards, UploadedFile, UseInterceptors, ConflictException } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

const logoStorage = diskStorage({
    destination: './uploads/company',
    filename: (_, file, cb) => cb(null, 'logo-' + Date.now() + extname(file.originalname)),
});

// ---- Payments Type ----
@Injectable()
class PaymentsTypeService {
    constructor(@InjectRepository(TipoPago) private repo: Repository<TipoPago>) { }
    findAll() { return this.repo.find(); }
    findActive() { return this.repo.find({ where: { estado: 1 } }); }
    findOne(id: number) { return this.repo.findOne({ where: { idtipopago: id } }); }
    async create(nombre: string, descripcion: string) {
        return this.repo.save(this.repo.create({ nombre, descripcion, estado: 1 }));
    }
    async update(id: number, nombre: string, descripcion: string) {
        await this.repo.update(id, { nombre, descripcion }); return { message: 'OK' };
    }
    async toggle(id: number, estado: number) { await this.repo.update(id, { estado }); return { message: 'OK' }; }

    async remove(id: number) {
        try {
            await this.repo.delete(id);
            return { message: 'OK' };
        } catch (e: any) {
            // Usualmente falla por FK si el tipo fue usado en ventas/compras
            throw new ConflictException('No se puede eliminar: el tipo de pago está en uso. Desactívalo en su lugar.');
        }
    }
}

@Controller('payments-type')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class PaymentsTypeController {
    constructor(private svc: PaymentsTypeService) { }
    @Get() findAll() { return this.svc.findActive(); }
    @Get('all') findAllAdmin() { return this.svc.findAll(); }
    @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }
    @Post() @RequirePermissions('config_pagos') create(@Body() b: any) { return this.svc.create(b.nombre, b.descripcion); }
    @Put(':id') @RequirePermissions('config_pagos') update(@Param('id', ParseIntPipe) id: number, @Body() b: any) { return this.svc.update(id, b.nombre, b.descripcion); }
    @Patch(':id/deactivate') @RequirePermissions('config_pagos') deactivate(@Param('id', ParseIntPipe) id: number) { return this.svc.toggle(id, 0); }
    @Patch(':id/activate') @RequirePermissions('config_pagos') activate(@Param('id', ParseIntPipe) id: number) { return this.svc.toggle(id, 1); }
    @Delete(':id') @RequirePermissions('config_pagos') remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}

// ---- Vouchers ----
@Injectable()
class VouchersService {
    constructor(@InjectRepository(CompPago) private repo: Repository<CompPago>) { }

    private mapOut(v: CompPago) {
        return {
            idcomprobante: v.id_comp_pago,
            nombre: v.nombre,
            serie: v.serie_comprobante ?? v.letra_serie ?? '',
            num_inicio: v.num_comprobante ? Number(v.num_comprobante) : 1,
            // mantener campos originales por compatibilidad
            id_comp_pago: v.id_comp_pago,
            letra_serie: v.letra_serie,
            serie_comprobante: v.serie_comprobante,
            num_comprobante: v.num_comprobante,
            condicion: v.condicion,
        };
    }

    private mapIn(dto: any) {
        const serie = dto?.serie ?? dto?.serie_comprobante ?? dto?.letra_serie ?? null;
        const num = dto?.num_inicio ?? dto?.num_comprobante ?? null;
        return {
            nombre: dto?.nombre,
            letra_serie: serie,
            serie_comprobante: serie,
            num_comprobante: num !== null && num !== undefined ? String(num) : null,
        };
    }

    findAll() { return this.repo.find(); }
    findActive() { return this.repo.find({ where: { condicion: 1 } }); }
    findOne(id: number) { return this.repo.findOne({ where: { id_comp_pago: id } }); }
    async create(dto: any) { return this.repo.save(this.repo.create({ ...this.mapIn(dto), condicion: 1 })); }
    async update(id: number, dto: any) { await this.repo.update(id, this.mapIn(dto)); return { message: 'OK' }; }
    async toggle(id: number, condicion: number) { await this.repo.update(id, { condicion }); return { message: 'OK' }; }

    async findAllMapped() {
        const list = await this.findAll();
        return list.map(v => this.mapOut(v));
    }

    async findActiveMapped() {
        const list = await this.findActive();
        return list.map(v => this.mapOut(v));
    }

    async findOneMapped(id: number) {
        const v = await this.findOne(id);
        return v ? this.mapOut(v) : null;
    }
}

@Controller('vouchers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class VouchersController {
    constructor(private svc: VouchersService) { }
    @Get() findAll() { return this.svc.findActiveMapped(); }
    @Get('all') findAllAdmin() { return this.svc.findAllMapped(); }
    @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOneMapped(id); }
    @Post() @RequirePermissions('config_comprobantes') create(@Body() b: any) { return this.svc.create(b); }
    @Put(':id') @RequirePermissions('config_comprobantes') update(@Param('id', ParseIntPipe) id: number, @Body() b: any) { return this.svc.update(id, b); }
    @Patch(':id/deactivate') @RequirePermissions('config_comprobantes') deactivate(@Param('id', ParseIntPipe) id: number) { return this.svc.toggle(id, 0); }
    @Patch(':id/activate') @RequirePermissions('config_comprobantes') activate(@Param('id', ParseIntPipe) id: number) { return this.svc.toggle(id, 1); }
}

// ---- Company ----
@Injectable()
class CompanyService {
    constructor(@InjectRepository(DatosNegocio) private repo: Repository<DatosNegocio>) { }

    private mapOut(e: DatosNegocio) {
        return {
            id_negocio: e.id_negocio,
            nombre: e.nombre,
            // aliases esperados por frontend
            ruc: e.ndocumento ?? null,
            igv: e.monto_impuesto ?? 0,

            // campos reales en BD
            ndocumento: e.ndocumento,
            documento: e.documento,
            direccion: e.direccion,
            telefono: e.telefono,
            email: e.email,
            logo: e.logo,
            pais: e.pais,
            ciudad: e.ciudad,
            nombre_impuesto: e.nombre_impuesto,
            monto_impuesto: e.monto_impuesto,
            moneda: e.moneda,
            simbolo: e.simbolo,
            condicion: e.condicion,
            zona_horaria: e.zona_horaria ?? null,
        };
    }

    private mapIn(dto: any): Partial<DatosNegocio> {
        const out: Partial<DatosNegocio> = {};

        const pickStr = (v: any) => (v === undefined || v === null ? undefined : String(v));

        const nombre = pickStr(dto?.nombre);
        if (nombre !== undefined) out.nombre = nombre;

        const ruc = pickStr(dto?.ruc ?? dto?.ndocumento);
        if (ruc !== undefined) out.ndocumento = ruc;

        const direccion = pickStr(dto?.direccion);
        if (direccion !== undefined) out.direccion = direccion;

        const telefono = pickStr(dto?.telefono);
        if (telefono !== undefined) out.telefono = telefono;

        const email = pickStr(dto?.email);
        if (email !== undefined) out.email = email;

        const moneda = pickStr(dto?.moneda);
        if (moneda !== undefined) out.moneda = moneda;

        const simbolo = pickStr(dto?.simbolo);
        if (simbolo !== undefined) out.simbolo = simbolo;

        const zona_horaria = pickStr(dto?.zona_horaria);
        if (zona_horaria !== undefined) out.zona_horaria = zona_horaria;

        const igvRaw = dto?.igv ?? dto?.monto_impuesto;
        if (igvRaw !== undefined && igvRaw !== null && String(igvRaw).trim() !== '') {
            const parsed = Number(igvRaw);
            if (!Number.isNaN(parsed)) out.monto_impuesto = parsed;
        }

        // NOTA: dto.web no existe en BD; se ignora para evitar 500.
        return out;
    }

    async findOne() {
        const empresa = await this.repo.findOne({ where: { id_negocio: 1 } });
        if (!empresa) {
            const nueva = this.repo.create({ nombre: 'Mi Empresa', simbolo: '$', condicion: 1, monto_impuesto: 0 });
            const saved = await this.repo.save(nueva);
            return this.mapOut(saved);
        }
        return this.mapOut(empresa);
    }
    async update(dto: any, logo?: string) {
        // findOne() ya retorna mapeado; necesitamos el registro real
        const empresa = await this.repo.findOne({ where: { id_negocio: 1 } });
        if (!empresa) {
            const created = await this.repo.save(this.repo.create({ nombre: 'Mi Empresa', simbolo: '$', condicion: 1, monto_impuesto: 0 }));
            await this.repo.update(created.id_negocio, { ...this.mapIn(dto), ...(logo ? { logo } : {}) });
            const refreshed = await this.repo.findOne({ where: { id_negocio: created.id_negocio } });
            return refreshed ? this.mapOut(refreshed) : null;
        }
        await this.repo.update(empresa.id_negocio, { ...this.mapIn(dto), ...(logo ? { logo } : {}) });
        const refreshed = await this.repo.findOne({ where: { id_negocio: empresa.id_negocio } });
        return refreshed ? this.mapOut(refreshed) : null;
    }
}

@Controller('company')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class CompanyController {
    constructor(private svc: CompanyService) { }
    @Get() findOne() { return this.svc.findOne(); }
    @Put() @RequirePermissions('config_generales')
    @UseInterceptors(FileInterceptor('logo', { storage: logoStorage }))
    update(@Body() b: any, @UploadedFile() file?: Express.Multer.File) {
        return this.svc.update(b, file?.filename);
    }
}

@Module({
    imports: [TypeOrmModule.forFeature([TipoPago, CompPago, DatosNegocio])],
    controllers: [PaymentsTypeController, VouchersController, CompanyController],
    providers: [PaymentsTypeService, VouchersService, CompanyService],
})
export class PaymentsTypeModule { }
