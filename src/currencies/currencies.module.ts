import { Module, Injectable, Controller, Get, Post, Put, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Moneda } from '../entities/moneda.entity';

@Injectable()
class CurrenciesService {
    constructor(@InjectRepository(Moneda) private repo: Repository<Moneda>) { }

    findAll() { return this.repo.find(); }
    findActive() { return this.repo.find({ where: { estado: 1 } }); }
    findOne(id: number) { return this.repo.findOne({ where: { idmoneda: id } }); }

    async create(dto: any) {
        const codigo = String(dto?.codigo ?? '').trim().toUpperCase();
        const nombre = String(dto?.nombre ?? '').trim();
        const simbolo = String(dto?.simbolo ?? '').trim();
        return this.repo.save(this.repo.create({ codigo, nombre, simbolo, estado: 1 }));
    }

    async update(id: number, dto: any) {
        const patch: Partial<Moneda> = {};
        if (dto?.codigo !== undefined) patch.codigo = String(dto.codigo).trim().toUpperCase();
        if (dto?.nombre !== undefined) patch.nombre = String(dto.nombre).trim();
        if (dto?.simbolo !== undefined) patch.simbolo = String(dto.simbolo).trim();
        await this.repo.update(id, patch);
        return { message: 'OK' };
    }

    async toggle(id: number, estado: number) {
        await this.repo.update(id, { estado });
        return { message: 'OK' };
    }
}

@Controller('currencies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class CurrenciesController {
    constructor(private svc: CurrenciesService) { }

    @Get() findActive() { return this.svc.findActive(); }
    @Get('all') findAll() { return this.svc.findAll(); }
    @Get(':id') findOne(@Param('id', ParseIntPipe) id: number) { return this.svc.findOne(id); }

    @Post()
    @RequirePermissions('config_generales')
    create(@Body() b: any) { return this.svc.create(b); }

    @Put(':id')
    @RequirePermissions('config_generales')
    update(@Param('id', ParseIntPipe) id: number, @Body() b: any) { return this.svc.update(id, b); }

    @Patch(':id/deactivate')
    @RequirePermissions('config_generales')
    deactivate(@Param('id', ParseIntPipe) id: number) { return this.svc.toggle(id, 0); }

    @Patch(':id/activate')
    @RequirePermissions('config_generales')
    activate(@Param('id', ParseIntPipe) id: number) { return this.svc.toggle(id, 1); }
}

@Module({
    imports: [TypeOrmModule.forFeature([Moneda])],
    controllers: [CurrenciesController],
    providers: [CurrenciesService],
})
export class CurrenciesModule { }
