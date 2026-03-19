import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ingreso } from '../entities/ingreso.entity';
import { DetalleIngreso } from '../entities/detalle-ingreso.entity';
import { Articulo } from '../entities/articulo.entity';
import { AsientoContable } from '../entities/asiento-contable.entity';
import { DetalleAsiento } from '../entities/detalle-asiento.entity';
import { PlanCuentas } from '../entities/plan-cuentas.entity';
import { ArticuloImei } from '../entities/articulo-imei.entity';
import { ArticuloStock } from '../entities/articulo-stock.entity';
import { InventarioMovimiento } from '../entities/inventario-movimiento.entity';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
    imports: [TypeOrmModule.forFeature([Ingreso, DetalleIngreso, Articulo, ArticuloImei, AsientoContable, DetalleAsiento, PlanCuentas, ArticuloStock, InventarioMovimiento])],
    controllers: [PurchasesController],
    providers: [PurchasesService],
    exports: [PurchasesService],
})
export class PurchasesModule { }
