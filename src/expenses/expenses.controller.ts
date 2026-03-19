import { Controller, Get, Post, Put, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { ExpensesService } from './expenses.service';

@Controller('expenses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExpensesController {
    constructor(private service: ExpensesService) { }

    @Get()
    @RequirePermissions('ventas_gastos')
    findAll(@CurrentUser() user: any) {
        return this.service.findAll(user.idusuario, user.idrol, user.idsucursal);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

    @Post()
    @RequirePermissions('ventas_gastos')
    create(@Body() body: any, @CurrentUser() user: any) {
        return this.service.create({ ...body, idsucursal: user.idsucursal }, user.idusuario);
    }

    @Put(':id')
    @RequirePermissions('ventas_gastos')
    update(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
        return this.service.update(id, body);
    }

    @Patch(':id/deactivate')
    deactivate(@Param('id', ParseIntPipe) id: number) { return this.service.deactivate(id); }

    @Patch(':id/activate')
    activate(@Param('id', ParseIntPipe) id: number) { return this.service.activate(id); }
}
