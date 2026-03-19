import {
    Controller, Get, Post, Put, Patch, Body, Param,
    UseGuards, UploadedFile, UseInterceptors, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { ProductsService } from './products.service';

const imgStorage = diskStorage({
    destination: './uploads/products',
    filename: (_, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + extname(file.originalname)),
});

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
    constructor(private service: ProductsService) { }

    @Get()
    findAll(@CurrentUser() user: any) { return this.service.findAll(user.idsucursal); }

    @Get('activos')
    findActivos(@CurrentUser() user: any) { return this.service.findActivos(user.idsucursal); }

    @Get('activos/con-stock')
    findActivosConStock(@CurrentUser() user: any) { return this.service.findActivosConStock(user.idsucursal); }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) { return this.service.findOne(id); }

    @Get(':id/stock')
    validateStock(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) { return this.service.validateStock(id, user.idsucursal); }

    @Post()
    @RequirePermissions('almacen_articulos')
    @UseInterceptors(FileInterceptor('imagen', { storage: imgStorage }))
    create(@Body() body: any, @UploadedFile() file?: Express.Multer.File) {
        return this.service.create(body, file?.filename);
    }

    @Put(':id')
    @RequirePermissions('almacen_articulos')
    @UseInterceptors(FileInterceptor('imagen', { storage: imgStorage }))
    update(@Param('id', ParseIntPipe) id: number, @Body() body: any, @UploadedFile() file?: Express.Multer.File) {
        return this.service.update(id, body, file?.filename);
    }

    @Patch(':id/deactivate')
    @RequirePermissions('almacen_articulos')
    deactivate(@Param('id', ParseIntPipe) id: number) { return this.service.deactivate(id); }

    @Patch(':id/activate')
    @RequirePermissions('almacen_articulos')
    activate(@Param('id', ParseIntPipe) id: number) { return this.service.activate(id); }

    @Patch(':id/decrease/:qty')
    decreaseStock(@Param('id', ParseIntPipe) id: number, @Param('qty', ParseIntPipe) qty: number, @CurrentUser() user: any) {
        return this.service.decreaseStock(id, qty, user.idsucursal);
    }

    @Patch(':id/increase/:qty')
    increaseStock(@Param('id', ParseIntPipe) id: number, @Param('qty', ParseIntPipe) qty: number, @CurrentUser() user: any) {
        return this.service.increaseStock(id, qty, user.idsucursal);
    }
}
