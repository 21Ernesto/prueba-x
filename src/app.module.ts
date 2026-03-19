import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { ScheduleModule } from '@nestjs/schedule';

import { Usuario } from './entities/usuario.entity';
import { Rol } from './entities/rol.entity';
import { Permiso } from './entities/permiso.entity';
import { Persona } from './entities/persona.entity';
import { Categoria } from './entities/categoria.entity';
import { Articulo } from './entities/articulo.entity';
import { ArticuloImei } from './entities/articulo-imei.entity';
import { Ingreso } from './entities/ingreso.entity';
import { DetalleIngreso } from './entities/detalle-ingreso.entity';
import { Venta } from './entities/venta.entity';
import { DetalleVenta } from './entities/detalle-venta.entity';
import { Gasto } from './entities/gasto.entity';
import { TipoPago } from './entities/tipo-pago.entity';
import { CompPago } from './entities/comp-pago.entity';
import { DatosNegocio } from './entities/datos-negocio.entity';
import { Moneda } from './entities/moneda.entity';
import { Caja } from './entities/caja.entity';
import { CajaSesion } from './entities/caja-sesion.entity';
import { CajaMovimiento } from './entities/caja-movimiento.entity';
import { PlanCuentas } from './entities/plan-cuentas.entity';
import { AsientoContable } from './entities/asiento-contable.entity';
import { DetalleAsiento } from './entities/detalle-asiento.entity';
import { PlantillaComprobante } from './entities/plantilla-comprobante.entity';
import { Cotizacion } from './entities/cotizacion.entity';
import { DetalleCotizacion } from './entities/detalle-cotizacion.entity';
import { Sucursal } from './entities/sucursal.entity';
import { ArticuloStock } from './entities/articulo-stock.entity';
import { InventarioMovimiento } from './entities/inventario-movimiento.entity';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { PersonsModule } from './persons/persons.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CajaModule } from './caja/caja.module';
import { AccountsModule } from './accounts/accounts.module';
import { JournalEntriesModule } from './journal-entries/journal-entries.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { GraphicsModule } from './graphics/graphics.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { PaymentsTypeModule } from './payments-type/payments-type.module';
import { CompanyModule } from './company/company.module';
import { ReportsModule } from './reports/reports.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { TemplatesModule } from './templates/templates.module';
import { QuotationsModule } from './quotations/quotations.module';
import { BranchesModule } from './branches/branches.module';
import { InventoryModule } from './inventory/inventory.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ScheduleModule.forRoot(),
        TypeOrmModule.forRoot({
            type: 'mysql',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT, 10) || 3306,
            username: process.env.DB_USER || 'root',
            password: process.env.DB_PASS || '',
            database: process.env.DB_NAME || 'venzo_pos',
            entities: [
                Usuario, Rol, Permiso, Persona, Categoria, Articulo,
                ArticuloImei,
                Ingreso, DetalleIngreso, Venta, DetalleVenta, Gasto,
                TipoPago, CompPago, DatosNegocio, Moneda, Caja, CajaSesion,
                CajaMovimiento, PlanCuentas, AsientoContable, DetalleAsiento,
                PlantillaComprobante, Cotizacion, DetalleCotizacion,
                Sucursal, ArticuloStock, InventarioMovimiento,
            ],
            synchronize: true,
            logging: false,
            timezone: 'local',
        }),
        AuthModule,
        UsersModule,
        RolesModule,
        PermissionsModule,
        ProductsModule,
        CategoriesModule,
        PersonsModule,
        SalesModule,
        PurchasesModule,
        ExpensesModule,
        CajaModule,
        AccountsModule,
        JournalEntriesModule,
        DashboardModule,
        GraphicsModule,
        VouchersModule,
        PaymentsTypeModule,
        CompanyModule,
        CurrenciesModule,
        TemplatesModule,
        QuotationsModule,
        ReportsModule,
        BranchesModule,
        InventoryModule,
    ],
})
export class AppModule { }

