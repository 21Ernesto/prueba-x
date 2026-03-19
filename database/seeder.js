"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const [k, ...rest] = line.trim().split('=');
        if (k && !k.startsWith('#'))
            process.env[k.trim()] = rest.join('=').trim();
    }
}
const ds = new typeorm_1.DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: +(process.env.DB_PORT || 3306),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'venzo_pos',
    synchronize: true,
    entities: [path.join(__dirname, '../src/**/*.entity{.ts,.js}')],
});
async function run(q, sql, params = []) {
    return q.query(sql, params);
}
async function seed() {
    console.log('🔗 Conectando a la base de datos y sincronizando tablas...');
    await ds.initialize();
    console.log('✅ Base de datos sincronizada\n');
    console.log('🏛️ Creando sucursal por defecto...');
    await run(ds, `INSERT IGNORE INTO sucursal (idsucursal, nombre, direccion, telefono, condicion)
        VALUES (1, 'Venzo Central', 'Calle Principal #123', '0999999999', 1)`);
    console.log('📋 Insertando permisos...');
    const permisos = [
        ['Escritorio', 'escritorio', 'Dashboard'],
        ['Nueva Venta', 'ventas_nueva', 'Ventas'],
        ['Lista de Ventas', 'ventas_listado', 'Ventas'],
        ['Compras', 'compras_ingresos', 'Compras'],
        ['Gastos', 'ventas_gastos', 'Ventas'],
        ['Nueva Cotización', 'cotizaciones_nueva', 'Cotizaciones'],
        ['Lista de Cotizaciones', 'cotizaciones_listado', 'Cotizaciones'],
        ['Inventario', 'inventario', 'Catálogo'],
        ['Sucursales', 'sucursales', 'Administración'],
        ['Caja', 'caja', 'Caja'],
        ['Productos', 'almacen_articulos', 'Catálogo'],
        ['Categorías', 'almacen_categorias', 'Catálogo'],
        ['Clientes', 'ventas_clientes', 'Catálogo'],
        ['Proveedores', 'compras_proveedores', 'Catálogo'],
        ['Rpt. Ventas', 'reportes_ventas_general', 'Reportes'],
        ['Rpt. Compras', 'reportes_compras_general', 'Reportes'],
        ['Ing./Egresos', 'reportes_ingresos_egresos', 'Reportes'],
        ['Libro Diario', 'reportes_libro_diario', 'Reportes'],
        ['Gráficas', 'reportes_graficos', 'Reportes'],
        ['Usuarios', 'acceso_usuarios', 'Administración'],
        ['Roles', 'acceso_roles', 'Administración'],
        ['Cajas', 'caja_gestion', 'Administración'],
        ['Plan de Cuentas', 'config_accounts', 'Administración'],
        ['Asientos', 'reportes_asientos', 'Reportes'],
        ['Mi Negocio', 'config_generales', 'Administración'],
        ['Monedas', 'config_monedas', 'Administración'],
        ['Comprobantes', 'config_comprobantes', 'Administración'],
        ['Plantillas', 'config_plantillas', 'Administración'],
        ['Tipos de Pago', 'config_pagos', 'Administración'],
    ];
    for (const [nombre, clave, grupo] of permisos) {
        await run(ds, `INSERT IGNORE INTO permiso (nombre, clave, grupo) VALUES (?, ?, ?)`, [nombre, clave, grupo]);
    }
    console.log(`   ✓ ${permisos.length} permisos insertados`);
    console.log('🎭 Creando rol Administrador...');
    await run(ds, `INSERT IGNORE INTO rol (idrol, nombre, descripcion, estado) VALUES
        (1, 'Administrador', 'Acceso total al sistema', 1)`);
    await run(ds, `DELETE FROM rol_permiso WHERE idrol = 1`);
    await run(ds, `INSERT INTO rol_permiso (idrol, idpermiso)
        SELECT 1, idpermiso FROM permiso`);
    console.log('   ✓ Rol Administrador configurado con todos los permisos');
    console.log('🏦 Creando caja principal...');
    await run(ds, `INSERT IGNORE INTO cajas (idcaja, nombre, descripcion, estado, idsucursal) VALUES
        (1, 'Caja Principal', 'Caja inicial', 1, 1)`);
    console.log('👤 Creando usuario administrador...');
    const adminHash = await bcrypt.hash('admin123', 10);
    await run(ds, `INSERT IGNORE INTO usuario
        (idusuario, idrol, idcaja, idsucursal, nombre, login, clave, condicion) VALUES
        (1, 1, 1, 1, 'Administrador', 'admin', ?, 1)`, [adminHash]);
    console.log('   ✓ Usuario administrador creado: admin / admin123');
    await ds.destroy();
    console.log('\n✅ Proceso de seeding completado exitosamente.\n');
}
seed().catch(err => {
    console.error('\n❌ Error en seeder:', err.message ?? err);
    process.exit(1);
});
//# sourceMappingURL=seeder.js.map