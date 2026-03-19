import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { PlantillaComprobante } from '../entities/plantilla-comprobante.entity';
import { DatosNegocio } from '../entities/datos-negocio.entity';
import { Venta } from '../entities/venta.entity';
import { CompPago } from '../entities/comp-pago.entity';
import { Cotizacion } from '../entities/cotizacion.entity';
import { DetalleCotizacion } from '../entities/detalle-cotizacion.entity';
import { TipoPago } from '../entities/tipo-pago.entity';

@Module({
    imports: [TypeOrmModule.forFeature([PlantillaComprobante, DatosNegocio, Venta, CompPago, Cotizacion, DetalleCotizacion, TipoPago])],
    controllers: [TemplatesController],
    providers: [TemplatesService],
    exports: [TemplatesService],
})
export class TemplatesModule { }
