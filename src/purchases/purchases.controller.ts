import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PurchasesController {
    constructor(private service: PurchasesService) { }

    @Get()
    @RequirePermissions('compras_listado')
    findAll(@CurrentUser() user: any) {
        return this.service.findAll(user.idusuario, user.idrol, user.permisos, user.idsucursal);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

    @Post()
    @RequirePermissions('compras_ingresos')
    create(@Body() body: any, @CurrentUser() user: any) {
        return this.service.create({ ...body, idusuario: user.idusuario, idsucursal: user.idsucursal });
    }

    @Patch(':id/anular')
    @RequirePermissions('compras_ingresos')
    anular(@Param('id', ParseIntPipe) id: number, @CurrentUser('idusuario') uid: number) { return this.service.anular(id, uid); }
}
