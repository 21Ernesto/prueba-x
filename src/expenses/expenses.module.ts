import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gasto } from '../entities/gasto.entity';
import { AsientoContable } from '../entities/asiento-contable.entity';
import { DetalleAsiento } from '../entities/detalle-asiento.entity';
import { PlanCuentas } from '../entities/plan-cuentas.entity';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';

@Module({
    imports: [TypeOrmModule.forFeature([Gasto, AsientoContable, DetalleAsiento, PlanCuentas])],
    controllers: [ExpensesController],
    providers: [ExpensesService],
})
export class ExpensesModule { }
