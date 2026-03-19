import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, PreviewTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { Response, Request } from 'express';
import { PlantillaTipo } from '../entities/plantilla-comprobante.entity';

function getOriginFromReq(req: Request) {
    const proto = (req.headers['x-forwarded-proto'] as string) || (req as any).protocol || 'http';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host');
    return `${proto}://${host}`;
}

@Controller('templates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TemplatesController {
    constructor(private svc: TemplatesService) { }

    @Get()
    @RequirePermissions('config_comprobantes')
    findAll() {
        return this.svc.findAll();
    }

    @Get(':id')
    @RequirePermissions('config_comprobantes')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.svc.findOne(id);
    }

    @Post()
    @RequirePermissions('config_comprobantes')
    create(@Body() dto: CreateTemplateDto) {
        return this.svc.create(dto as any);
    }

    @Put(':id')
    @RequirePermissions('config_comprobantes')
    update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
        return this.svc.update(id, dto as any);
    }

    @Patch(':id/activate')
    @RequirePermissions('config_comprobantes')
    activate(@Param('id', ParseIntPipe) id: number) {
        return this.svc.setActive(id, 1);
    }

    @Patch(':id/deactivate')
    @RequirePermissions('config_comprobantes')
    deactivate(@Param('id', ParseIntPipe) id: number) {
        return this.svc.setActive(id, 0);
    }

    @Post('preview')
    @RequirePermissions('config_comprobantes')
    async preview(@Body() dto: PreviewTemplateDto, @Res() res: Response, @Query('ventaId') ventaIdQ?: string, @Query('tipo') tipoQ?: PlantillaTipo) {
        // Allow ventaId and tipo via query for convenience
        const ventaId = dto.ventaId ?? (ventaIdQ ? Number(ventaIdQ) : undefined);
        const tipo = (dto.tipo ?? tipoQ ?? 'TICKET') as PlantillaTipo;
        const origin = getOriginFromReq((res as any).req);
        const html = await this.svc.renderHtml(dto.html, ventaId, origin);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(html);
    }

    @Post('pdf')
    @RequirePermissions('config_comprobantes')
    async pdf(@Body() dto: PreviewTemplateDto, @Res() res: Response, @Query('ventaId') ventaIdQ?: string, @Query('tipo') tipoQ?: PlantillaTipo) {
        const ventaId = dto.ventaId ?? (ventaIdQ ? Number(ventaIdQ) : undefined);
        const tipo = (dto.tipo ?? tipoQ ?? 'TICKET') as PlantillaTipo;
        const origin = getOriginFromReq((res as any).req);
        const pdf = await this.svc.renderPdfFromHtml(dto.html, tipo, ventaId, origin);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="plantilla.pdf"');
        return res.send(pdf);
    }

    @Get(':id/pdf')
    @RequirePermissions('config_comprobantes')
    async pdfFromTemplate(
        @Param('id', ParseIntPipe) id: number,
        @Query('ventaId') ventaIdQ: string,
        @Res() res: Response,
    ) {
        const ventaId = ventaIdQ ? Number(ventaIdQ) : undefined;
        const origin = getOriginFromReq((res as any).req);
        const pdf = await this.svc.renderPdfFromTemplate(id, ventaId, origin);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="plantilla-${id}.pdf"`);
        return res.send(pdf);
    }
}
