import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Caja } from '../entities/caja.entity';
import { CajaSesion } from '../entities/caja-sesion.entity';
import { CajaMovimiento } from '../entities/caja-movimiento.entity';
import { Venta } from '../entities/venta.entity';

@Injectable()
export class CajaService {
    constructor(
        @InjectRepository(Caja) private cajaRepo: Repository<Caja>,
        @InjectRepository(CajaSesion) private sesionRepo: Repository<CajaSesion>,
        @InjectRepository(CajaMovimiento) private movRepo: Repository<CajaMovimiento>,
        private dataSource: DataSource,
    ) { }

    // ---- CAJAS FÍSICAS ----
    findCajas(idsucursal?: number) {
        if (idsucursal) return this.cajaRepo.find({ where: { idsucursal } });
        return this.cajaRepo.find();
    }
    findCajasActivas(idsucursal?: number) {
        if (idsucursal) return this.cajaRepo.find({ where: { estado: 1, idsucursal } });
        return this.cajaRepo.find({ where: { estado: 1 } });
    }
    findOneCaja(id: number) { return this.cajaRepo.findOne({ where: { idcaja: id } }); }

    async createCaja(nombre: string, descripcion: string, idsucursal?: number) {
        const c = this.cajaRepo.create({ nombre, descripcion, estado: 1, idsucursal });
        return this.cajaRepo.save(c);
    }

    async updateCaja(id: number, nombre: string, descripcion: string) {
        await this.cajaRepo.update(id, { nombre, descripcion });
        return { message: 'Caja actualizada' };
    }

    async deactivateCaja(id: number) {
        await this.cajaRepo.update(id, { estado: 0 });
        return { message: 'Caja desactivada' };
    }

    async activateCaja(id: number) {
        await this.cajaRepo.update(id, { estado: 1 });
        return { message: 'Caja activada' };
    }

    // ---- SESIONES ----
    async getSesionAbierta(idusuario: number) {
        return this.sesionRepo.findOne({
            where: { idusuario, estado: 'Abierta' },
            relations: ['caja'],
        });
    }

    async abrirCaja(idusuario: number, idcaja: number, montoApertura: number) {
        // Verificar si usuario ya tiene sesión abierta
        const existeUsuario = await this.sesionRepo.findOne({ where: { idusuario, estado: 'Abierta' } });
        if (existeUsuario) throw new BadRequestException('Ya tienes una caja abierta');

        // Verificar si caja ya está abierta hoy
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const existeCaja = await this.sesionRepo.createQueryBuilder('s')
            .where('s.idcaja = :idcaja AND s.fecha_apertura >= :hoy AND s.estado = :estado', {
                idcaja, hoy, estado: 'Abierta',
            })
            .getOne();

        if (existeCaja) throw new BadRequestException('Esta caja ya está abierta');

        const sesion = this.sesionRepo.create({
            idcaja, idusuario,
            fecha_apertura: new Date(),
            monto_apertura: montoApertura,
            monto_ventas_efectivo: 0,
            monto_ingresos_manual: 0,
            monto_egresos_manual: 0,
            estado: 'Abierta',
        });
        return this.sesionRepo.save(sesion);
    }

    async cerrarCaja(idp_caja: number, montoReal: number, observaciones: string) {
        const sesion = await this.sesionRepo.findOne({ where: { idp_caja } });
        if (!sesion) throw new BadRequestException('Sesión no encontrada');

        const esperado = parseFloat(String(sesion.monto_apertura)) +
            parseFloat(String(sesion.monto_ventas_efectivo)) +
            parseFloat(String(sesion.monto_ingresos_manual)) -
            parseFloat(String(sesion.monto_egresos_manual));

        await this.sesionRepo.update(idp_caja, {
            fecha_cierre: new Date(),
            monto_cierre_esperado: esperado,
            monto_cierre_real: montoReal,
            observaciones,
            estado: 'Cerrada',
        });
        return { message: 'Caja cerrada correctamente', esperado };
    }

    async agregarMovimiento(idp_caja: number, tipo: 'Ingreso' | 'Egreso', monto: number, descripcion: string) {
        const mov = this.movRepo.create({ idp_caja, tipo, monto, descripcion, fecha_hora: new Date() });
        await this.movRepo.save(mov);

        if (tipo === 'Ingreso') {
            await this.sesionRepo.increment({ idp_caja }, 'monto_ingresos_manual', monto);
        } else {
            await this.sesionRepo.increment({ idp_caja }, 'monto_egresos_manual', monto);
        }
        return { message: 'Movimiento registrado' };
    }

    async getTotales(idp_caja: number) {
        const sesion = await this.sesionRepo.findOne({
            where: { idp_caja },
            relations: ['caja'],
        });
        if (!sesion) throw new BadRequestException('Sesión no encontrada');

        const total = parseFloat(String(sesion.monto_apertura)) +
            parseFloat(String(sesion.monto_ventas_efectivo)) +
            parseFloat(String(sesion.monto_ingresos_manual)) -
            parseFloat(String(sesion.monto_egresos_manual));

        return { ...sesion, total_actual: total };
    }

    async findSesiones(idusuario?: number, idrol?: number, idsucursal?: number) {
        const qb = this.sesionRepo.createQueryBuilder('s')
            .leftJoinAndSelect('s.caja', 'c')
            .leftJoinAndSelect('s.usuario', 'u')
            .orderBy('s.idp_caja', 'DESC');
        if (idrol !== 1 && idusuario) {
            qb.where('s.idusuario = :uid', { uid: idusuario });
        } else if (idrol !== 1 && idsucursal) {
            qb.where('s.idsucursal = :sid', { sid: idsucursal });
        }
        return qb.getMany();
    }

    async findMovimientos(idp_caja: number) {
        return this.movRepo.find({ where: { idp_caja }, order: { id_movimiento: 'DESC' } });
    }

    async findSesionesByCaja(idcaja: number) {
        return this.sesionRepo.find({
            where: { idcaja },
            relations: ['usuario'],
            order: { idp_caja: 'DESC' },
        });
    }

    async findOneSesion(idp_caja: number) {
        const sesion = await this.sesionRepo.findOne({
            where: { idp_caja },
            relations: ['caja', 'usuario'],
        });
        if (!sesion) throw new BadRequestException('Sesión no encontrada');
        return sesion;
    }

    async findSalesBySesion(idp_caja: number) {
        const sesion = await this.sesionRepo.findOne({ where: { idp_caja } });
        if (!sesion) throw new BadRequestException('Sesión no encontrada');

        const qb = this.dataSource.getRepository(Venta).createQueryBuilder('v')
            .leftJoinAndSelect('v.cliente', 'c')
            .leftJoinAndSelect('v.usuario', 'u')
            .where('v.idcaja = :idcaja', { idcaja: sesion.idcaja })
            .andWhere('v.fecha_hora >= :inicio', { inicio: sesion.fecha_apertura });

        if (sesion.fecha_cierre) {
            qb.andWhere('v.fecha_hora <= :fin', { fin: sesion.fecha_cierre });
        }

        return qb.orderBy('v.idventa', 'DESC').getMany();
    }

    private readonly logger = new Logger(CajaService.name);

    @Cron('0 0 * * *') // Midnight daily
    async handleMidnightClosure() {
        this.logger.log('Iniciando proceso de cierre automático de caja...');
        
        const sessions = await this.sesionRepo.find({
            where: { estado: 'Abierta' }
        });

        if (sessions.length === 0) {
            this.logger.log('No hay sesiones abiertas para cerrar.');
            return;
        }

        for (const sesion of sessions) {
            try {
                this.logger.log(`Cerrando sesión #${sesion.idp_caja} de la caja #${sesion.idcaja}...`);
                const esperado = parseFloat(String(sesion.monto_apertura)) +
                    parseFloat(String(sesion.monto_ventas_efectivo)) +
                    parseFloat(String(sesion.monto_ingresos_manual)) -
                    parseFloat(String(sesion.monto_egresos_manual));

                await this.sesionRepo.update(sesion.idp_caja, {
                    fecha_cierre: new Date(),
                    monto_cierre_esperado: esperado,
                    monto_cierre_real: esperado,
                    observaciones: 'Cierre automático de medianoche',
                    estado: 'Cerrada',
                });

                this.logger.log(`Sesión #${sesion.idp_caja} cerrada correctamente.`);
            } catch (err) {
                this.logger.error(`Error cerrando sesión #${sesion.idp_caja}: ${err.message}`);
            }
        }

        this.logger.log('Proceso de cierre automático completado.');
    }
}
