import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanCuentas } from '../entities/plan-cuentas.entity';
import { AsientoContable } from '../entities/asiento-contable.entity';
import { DetalleAsiento } from '../entities/detalle-asiento.entity';
import { Controller, Get, Post, Put, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Injectable()
class AccountsService {
    constructor(@InjectRepository(PlanCuentas) private repo: Repository<PlanCuentas>) { }

    findAll() {
        return this.repo.createQueryBuilder('c')
            .leftJoinAndSelect('c.padre', 'p')
            .where('c.condicion = 1')
            .orderBy('c.codigo', 'ASC')
            .getMany();
    }

    findOne(id: number) { return this.repo.findOne({ where: { idcuenta: id } }); }
    findDetalle() { return this.repo.find({ where: { nivel: 2, condicion: 1 }, order: { codigo: 'ASC' } }); }

    async create(dto: any) {
        const c = this.repo.create({ ...dto, condicion: 1 });
        return this.repo.save(c);
    }

    async update(id: number, dto: any) {
        await this.repo.update(id, dto);
        return { message: 'Cuenta actualizada' };
    }

    async deactivate(id: number) { await this.repo.update(id, { condicion: 0 }); return { message: 'OK' }; }
    async activate(id: number) { await this.repo.update(id, { condicion: 1 }); return { message: 'OK' }; }
}

@Controller('accounts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class AccountsController {
    constructor(private service: AccountsService) { }

    @Get()
    findAll() { return this.service.findAll(); }

    @Get('detalle')
    findDetalle() { return this.service.findDetalle(); }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

    @Post()
    @RequirePermissions('config_accounts')
    create(@Body() body: any) { return this.service.create(body); }

    @Put(':id')
    @RequirePermissions('config_accounts')
    update(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.service.update(id, body); }

    @Patch(':id/deactivate')
    @RequirePermissions('config_accounts')
    deactivate(@Param('id', ParseIntPipe) id: number) { return this.service.deactivate(id); }

    @Patch(':id/activate')
    @RequirePermissions('config_accounts')
    activate(@Param('id', ParseIntPipe) id: number) { return this.service.activate(id); }
}

@Module({
    imports: [TypeOrmModule.forFeature([PlanCuentas, AsientoContable, DetalleAsiento])],
    controllers: [AccountsController],
    providers: [AccountsService],
})
export class AccountsModule { }
