import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
    constructor(private service: DashboardService) { }

    @Get('summary')
    @RequirePermissions('escritorio')
    async getSummary(@Query('inicio') ini?: string, @Query('fin') fin?: string) {
        try {
            console.log('[DEBUG] DashboardController: getSummary hit', { ini, fin });
            return await this.service.getSummary(ini, fin);
        } catch (error) {
            console.error('[DEBUG] DashboardController: getSummary error:', error);
            throw error;
        }
    }

    getComparativas() { return this.service.getComparativas(); }

    @Get('ventas-12-meses')
    getVentas12Meses(@Query('inicio') ini?: string, @Query('fin') fin?: string) {
        return this.service.getVentas12Meses(ini, fin);
    }

    @Get('compras-10-dias')
    getCompras10Dias() { return this.service.getCompras10Dias(); }

    @Get('top-productos')
    getTopProductos(@Query('inicio') ini?: string, @Query('fin') fin?: string) {
        return this.service.getTopProductos(ini, fin);
    }

    @Get('inventario')
    getInventarioSummary() { return this.service.getInventarioSummary(); }
}
