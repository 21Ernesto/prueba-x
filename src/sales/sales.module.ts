import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from '../entities/venta.entity';
import { DetalleVenta } from '../entities/detalle-venta.entity';
import { Articulo } from '../entities/articulo.entity';
import { CajaSesion } from '../entities/caja-sesion.entity';
import { AsientoContable } from '../entities/asiento-contable.entity';
import { DetalleAsiento } from '../entities/detalle-asiento.entity';
import { PlanCuentas } from '../entities/plan-cuentas.entity';
import { CompPago } from '../entities/comp-pago.entity';
import { TipoPago } from '../entities/tipo-pago.entity';
import { ArticuloImei } from '../entities/articulo-imei.entity';
import { ArticuloStock } from '../entities/articulo-stock.entity';
import { InventarioMovimiento } from '../entities/inventario-movimiento.entity';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
    imports: [TypeOrmModule.forFeature([Venta, DetalleVenta, Articulo, CajaSesion, AsientoContable, DetalleAsiento, PlanCuentas, CompPago, TipoPago, ArticuloImei, ArticuloStock, InventarioMovimiento])],
    controllers: [SalesController],
    providers: [SalesService],
    exports: [SalesService],
})
export class SalesModule { }
