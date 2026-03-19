import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SalesController {
    constructor(private service: SalesService) { }

    @Get()
    @RequirePermissions('ventas_listado')
    findAll(
        @CurrentUser() user: any,
        @Query('fecha_inicio') fecha_inicio?: string,
        @Query('fecha_fin') fecha_fin?: string,
    ) {
        return this.service.findAll(user.idusuario, user.idrol, user.permisos, fecha_inicio, fecha_fin, user.idsucursal);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

    @Post()
    @RequirePermissions('ventas_nueva')
    create(@Body() body: any, @CurrentUser() user: any) {
        return this.service.create({ ...body, idusuario: user.idusuario, idsucursal: user.idsucursal });
    }

    @Patch(':id/anular')
    @RequirePermissions('ventas_listado')
    anular(@Param('id', ParseIntPipe) id: number, @CurrentUser('idusuario') uid: number) { return this.service.anular(id, uid); }
}
