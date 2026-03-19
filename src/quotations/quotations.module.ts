import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { Cotizacion } from '../entities/cotizacion.entity';
import { DetalleCotizacion } from '../entities/detalle-cotizacion.entity';
import { Articulo } from '../entities/articulo.entity';
import { ArticuloStock } from '../entities/articulo-stock.entity';
import { CompPago } from '../entities/comp-pago.entity';
import { SalesModule } from '../sales/sales.module';
import { TemplatesModule } from '../templates/templates.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Cotizacion, DetalleCotizacion, Articulo, ArticuloStock, CompPago]),
        SalesModule,
        TemplatesModule,
    ],
    controllers: [QuotationsController],
    providers: [QuotationsService],
    exports: [QuotationsService],
})
export class QuotationsModule { }
