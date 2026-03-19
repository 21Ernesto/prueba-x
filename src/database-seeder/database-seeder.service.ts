import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { Usuario } from '../entities/usuario.entity';
import { Rol } from '../entities/rol.entity';
import { Permiso } from '../entities/permiso.entity';
import { Sucursal } from '../entities/sucursal.entity';
import { Caja } from '../entities/caja.entity';

@Injectable()
export class DatabaseSeederService implements OnModuleInit {
    private readonly logger = new Logger(DatabaseSeederService.name);

    constructor(
        private dataSource: DataSource,
        @InjectRepository(Usuario) private usuarioRepo: Repository<Usuario>,
        @InjectRepository(Rol) private rolRepo: Repository<Rol>,
        @InjectRepository(Permiso) private permisoRepo: Repository<Permiso>,
        @InjectRepository(Sucursal) private sucursalRepo: Repository<Sucursal>,
        @InjectRepository(Caja) private cajaRepo: Repository<Caja>,
    ) {}

    async onModuleInit() {
        this.logger.log('Checking if database needs seeding...');
        const userCount = await this.usuarioRepo.count();
        if (userCount === 0) {
            this.logger.log('Database is empty. Starting automatic seeding...');
            await this.seed();
        } else {
            this.logger.log('Database already has data. Skipping seeding.');
        }
    }

    private async seed() {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Sucursal
            this.logger.log('Creating default branch...');
            await queryRunner.manager.insert(Sucursal, {
                idsucursal: 1,
                nombre: 'Venzo Central',
                direccion: 'Calle Principal #123',
                telefono: '0999999999',
                condicion: 1,
            });

            // 2. Permisos
            this.logger.log('Inserting permissions...');
            const permisosData: Partial<Permiso>[] = [
                { nombre: 'Escritorio', clave: 'escritorio', grupo: 'Dashboard' },
                { nombre: 'Nueva Venta', clave: 'ventas_nueva', grupo: 'Ventas' },
                { nombre: 'Lista de Ventas', clave: 'ventas_listado', grupo: 'Ventas' },
                { nombre: 'Compras', clave: 'compras_ingresos', grupo: 'Compras' },
                { nombre: 'Gastos', clave: 'ventas_gastos', grupo: 'Ventas' },
                { nombre: 'Nueva Cotización', clave: 'cotizaciones_nueva', grupo: 'Cotizaciones' },
                { nombre: 'Lista de Cotizaciones', clave: 'cotizaciones_listado', grupo: 'Cotizaciones' },
                { nombre: 'Inventario', clave: 'inventario', grupo: 'Catálogo' },
                { nombre: 'Sucursales', clave: 'sucursales', grupo: 'Administración' },
                { nombre: 'Caja', clave: 'caja', grupo: 'Caja' },
                { nombre: 'Productos', clave: 'almacen_articulos', grupo: 'Catálogo' },
                { nombre: 'Categorías', clave: 'almacen_categorias', grupo: 'Catálogo' },
                { nombre: 'Clientes', clave: 'ventas_clientes', grupo: 'Catálogo' },
                { nombre: 'Proveedores', clave: 'compras_proveedores', grupo: 'Catálogo' },
                { nombre: 'Rpt. Ventas', clave: 'reportes_ventas_general', grupo: 'Reportes' },
                { nombre: 'Rpt. Compras', clave: 'reportes_compras_general', grupo: 'Reportes' },
                { nombre: 'Ing./Egresos', clave: 'reportes_ingresos_egresos', grupo: 'Reportes' },
                { nombre: 'Libro Diario', clave: 'reportes_libro_diario', grupo: 'Reportes' },
                { nombre: 'Gráficas', clave: 'reportes_graficos', grupo: 'Reportes' },
                { nombre: 'Usuarios', clave: 'acceso_usuarios', grupo: 'Administración' },
                { nombre: 'Roles', clave: 'acceso_roles', grupo: 'Administración' },
                { nombre: 'Cajas', clave: 'caja_gestion', grupo: 'Administración' },
                { nombre: 'Plan de Cuentas', clave: 'config_accounts', grupo: 'Administración' },
                { nombre: 'Asientos', clave: 'reportes_asientos', grupo: 'Reportes' },
                { nombre: 'Mi Negocio', clave: 'config_generales', grupo: 'Administración' },
                { nombre: 'Monedas', clave: 'config_monedas', grupo: 'Administración' },
                { nombre: 'Comprobantes', clave: 'config_comprobantes', grupo: 'Administración' },
                { nombre: 'Plantillas', clave: 'config_plantillas', grupo: 'Administración' },
                { nombre: 'Tipos de Pago', clave: 'config_pagos', grupo: 'Administración' },
            ];

            const createdPermisos = await queryRunner.manager.save(Permiso, permisosData);

            // 3. Roles
            this.logger.log('Creating Admin role...');
            const adminRol = await queryRunner.manager.save(Rol, {
                idrol: 1,
                nombre: 'Administrador',
                descripcion: 'Acceso total al sistema',
                estado: 1,
                permisos: createdPermisos,
            });

            // 4. Caja Principal
            this.logger.log('Creating main cash box...');
            await queryRunner.manager.insert(Caja, {
                idcaja: 1,
                nombre: 'Caja Principal',
                descripcion: 'Caja inicial',
                estado: 1,
                idsucursal: 1,
            });

            // 5. Usuario Administrador
            this.logger.log('Creating admin user...');
            const adminHash = await bcrypt.hash('admin123', 10);
            await queryRunner.manager.insert(Usuario, {
                idusuario: 1,
                idrol: 1,
                idcaja: 1,
                idsucursal: 1,
                nombre: 'Administrador',
                login: 'admin',
                clave: adminHash,
                condicion: 1,
            });

            await queryRunner.commitTransaction();
            this.logger.log('✅ Automatic seeding completed successfully.');
        } catch (error) {
            this.logger.error('❌ Error during automatic seeding:', error);
            await queryRunner.rollbackTransaction();
        } finally {
            await queryRunner.release();
        }
    }
}
