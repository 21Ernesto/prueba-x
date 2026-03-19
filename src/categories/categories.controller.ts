import { Controller, Get, Post, Put, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CategoriesService } from './categories.service';

@Controller('categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
    constructor(private service: CategoriesService) { }

    @Get()
    findAll() { return this.service.findAll(); }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

    @Post()
    @RequirePermissions('almacen_categorias')
    create(@Body() body: { nombre: string; descripcion: string }) {
        return this.service.create(body.nombre, body.descripcion);
    }

    @Put(':id')
    @RequirePermissions('almacen_categorias')
    update(@Param('id', ParseIntPipe) id: number, @Body() body: { nombre: string; descripcion: string }) {
        return this.service.update(id, body.nombre, body.descripcion);
    }

    @Patch(':id/deactivate')
    @RequirePermissions('almacen_categorias')
    deactivate(@Param('id', ParseIntPipe) id: number) { return this.service.deactivate(id); }

    @Patch(':id/activate')
    @RequirePermissions('almacen_categorias')
    activate(@Param('id', ParseIntPipe) id: number) { return this.service.activate(id); }
}
