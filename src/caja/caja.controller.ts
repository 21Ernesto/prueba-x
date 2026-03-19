import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, UseGuards, Res, NotFoundException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { CajaService } from './caja.service';
import { TemplatesService } from '../templates/templates.service';
import { Response } from 'express';

@Controller('caja')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CajaController {
    constructor(private service: CajaService, private templatesService: TemplatesService) { }

    // Sesiones
    @Get('sesion/actual')
    getSesionActual(@CurrentUser('idusuario') uid: number) {
        return this.service.getSesionAbierta(uid);
    }

    @Post('abrir')
    @RequirePermissions('caja')
    abrirCaja(
        @Body() body: { idcaja: number; monto_apertura: number },
        @CurrentUser('idusuario') uid: number,
    ) {
        return this.service.abrirCaja(uid, body.idcaja, body.monto_apertura);
    }

    @Post('cerrar')
    @RequirePermissions('caja')
    cerrarCaja(@Body() body: { idp_caja: number; monto_real: number; observaciones?: string }) {
        return this.service.cerrarCaja(body.idp_caja, body.monto_real, body.observaciones || '');
    }

    @Post('movimiento')
    @RequirePermissions('caja')
    agregarMovimiento(@Body() body: { idp_caja: number; tipo: 'Ingreso' | 'Egreso'; monto: number; descripcion: string }) {
        return this.service.agregarMovimiento(body.idp_caja, body.tipo, body.monto, body.descripcion);
    }

    @Get('totales/:id')
    getTotales(@Param('id', ParseIntPipe) id: number) { return this.service.getTotales(id); }

    @Get('sesiones')
    @RequirePermissions('caja')
    findSesiones(@CurrentUser() user: any) {
        return this.service.findSesiones(user.idusuario, user.idrol, user.idsucursal);
    }

    @Get('sesion/:id/movimientos')
    @RequirePermissions('caja')
    findMovimientos(@Param('id', ParseIntPipe) id: number) { return this.service.findMovimientos(id); }

    @Get('cajas/:id/sesiones')
    @RequirePermissions('caja_gestion')
    findSesionesByCaja(@Param('id', ParseIntPipe) id: number) {
        return this.service.findSesionesByCaja(id);
    }

    @Get('sesion/:id')
    @RequirePermissions('caja')
    findOneSesion(@Param('id', ParseIntPipe) id: number) {
        return this.service.findOneSesion(id);
    }

    @Get('sesion/:id/ventas')
    @RequirePermissions('caja')
    findSalesBySesion(@Param('id', ParseIntPipe) id: number) {
        return this.service.findSalesBySesion(id);
    }

    @Get('sesion/:id/pdf')
    @RequirePermissions('caja')
    async getClosurePdf(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
        const origin = `${res.req.protocol}://${res.req.get('host')}`;
        const out = await this.templatesService.renderClosurePdf(id, origin);
        if (!out) throw new NotFoundException('No hay plantilla de CUADRE activa');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="cuadre-${id}.pdf"`);
        return res.send(out.pdf);
    }

    // Cajas físicas
    @Get('cajas')
    @RequirePermissions('caja_gestion')
    findCajas(@CurrentUser() user: any) { return this.service.findCajas(user.idsucursal); }

    @Get('cajas/activas')
    findCajasActivas(@CurrentUser() user: any) { return this.service.findCajasActivas(user.idsucursal); }

    @Post('cajas')
    @RequirePermissions('caja_gestion')
    createCaja(@Body() body: { nombre: string; descripcion: string }, @CurrentUser() user: any) {
        return this.service.createCaja(body.nombre, body.descripcion, user.idsucursal);
    }

    @Patch('cajas/:id')
    @RequirePermissions('caja_gestion')
    updateCaja(@Param('id', ParseIntPipe) id: number, @Body() body: { nombre: string; descripcion: string }) {
        return this.service.updateCaja(id, body.nombre, body.descripcion);
    }

    @Patch('cajas/:id/deactivate')
    @RequirePermissions('caja_gestion')
    deactivateCaja(@Param('id', ParseIntPipe) id: number) { return this.service.deactivateCaja(id); }

    @Patch('cajas/:id/activate')
    @RequirePermissions('caja_gestion')
    activateCaja(@Param('id', ParseIntPipe) id: number) { return this.service.activateCaja(id); }
}
