import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('inventario')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Get('stock/:idsucursal')
    getStock(@Param('idsucursal') idsucursal: string) {
        return this.inventoryService.getStockByBranch(+idsucursal);
    }

    @Get('kardex')
    getKardex(@Query('idarticulo') idarticulo: string, @Query('idsucursal') idsucursal: string) {
        return this.inventoryService.getKardex(+idarticulo, +idsucursal);
    }

    @Post('adjust')
    adjust(@Body() data: any, @Request() req: any) {
        return this.inventoryService.adjustStock({
            ...data,
            idusuario: req.user.idusuario,
        });
    }

    @Post('transfer')
    transfer(@Body() data: any, @Request() req: any) {
        return this.inventoryService.transferStock({
            ...data,
            idusuario: req.user.idusuario,
        });
    }
}
