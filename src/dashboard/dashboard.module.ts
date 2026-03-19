import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venta } from '../entities/venta.entity';
import { Ingreso } from '../entities/ingreso.entity';
import { Gasto } from '../entities/gasto.entity';
import { Persona } from '../entities/persona.entity';
import { Articulo } from '../entities/articulo.entity';
import { Categoria } from '../entities/categoria.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
    imports: [TypeOrmModule.forFeature([Venta, Ingreso, Gasto, Persona, Articulo, Categoria])],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }
