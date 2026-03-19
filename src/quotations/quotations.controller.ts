import { Controller, Get, Post, Body, Param, Query, Patch, UseGuards, Request, Res } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Response } from 'express';
import { QuotationsService } from './quotations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('quotations')
@UseGuards(JwtAuthGuard)
export class QuotationsController {
    constructor(private readonly service: QuotationsService) { }

    @Get()
    findAll(
        @Query('fecha_inicio') fi?: string,
        @Query('fecha_fin') ff?: string,
        @CurrentUser() user?: any,
    ) {
        return this.service.findAll(fi, ff, user?.idsucursal);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    @Post()
    create(@Body() dto: any, @CurrentUser() user: any) {
        return this.service.create({ ...dto, idusuario: user.idusuario, idsucursal: user.idsucursal });
    }

    @Patch(':id/annul')
    annul(@Param('id') id: string) {
        return this.service.annul(+id);
    }

    @Post(':id/sale')
    convertToSale(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
        return this.service.convertToSale(+id, user.idusuario, dto);
    }

    @Get(':id/pdf')
    async getPdf(@Param('id') id: string, @Res() res: Response, @Request() req: any) {
        const originUrl = `${req.protocol}://${req.get('host')}`;
        const result = await this.service.renderPdf(+id, originUrl);
        if (!result) return res.status(404).json({ message: 'No se pudo generar la cotización' });

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename=cotizacion-${id}.pdf`,
        });

        if (result && result.pdf) {
            res.set('Content-Length', String(result.pdf.length));
            res.end(result.pdf);
        } else {
            res.status(404).json({ message: 'No se pudo generar la cotización' });
        }
    }
}
