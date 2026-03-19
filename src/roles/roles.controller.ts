import { Controller, Get, Post, Put, Patch, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { RolesService } from './roles.service';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
    constructor(private rolesService: RolesService) { }

    @Get()
    findAll() {
        return this.rolesService.findAll();
    }

    @Get('permissions')
    getAllPermissions() {
        return this.rolesService.getAllPermissions();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.rolesService.findOne(id);
    }

    @Post()
    @RequirePermissions('acceso_roles')
    create(@Body() body: { nombre: string; descripcion: string; permisosIds: number[] }) {
        return this.rolesService.create(body.nombre, body.descripcion, body.permisosIds);
    }

    @Put(':id')
    @RequirePermissions('acceso_roles')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { nombre: string; descripcion: string; permisosIds: number[] },
    ) {
        return this.rolesService.update(id, body.nombre, body.descripcion, body.permisosIds);
    }

    @Patch(':id/deactivate')
    @RequirePermissions('acceso_roles')
    deactivate(@Param('id', ParseIntPipe) id: number) {
        return this.rolesService.deactivate(id);
    }

    @Patch(':id/activate')
    @RequirePermissions('acceso_roles')
    activate(@Param('id', ParseIntPipe) id: number) {
        return this.rolesService.activate(id);
    }

    @Put(':id/permissions')
    @RequirePermissions('acceso_roles')
    updatePermissions(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: { permIds: number[] },
    ) {
        return this.rolesService.updatePermissions(id, body.permIds);
    }
}
