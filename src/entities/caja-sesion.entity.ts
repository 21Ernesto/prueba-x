import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Caja } from './caja.entity';
import { Usuario } from './usuario.entity';
import { CajaMovimiento } from './caja-movimiento.entity';

@Entity('caja_sesiones')
export class CajaSesion {
    @PrimaryGeneratedColumn()
    idp_caja: number;

    @Column()
    idcaja: number;

    @Column()
    idusuario: number;

    @Column({ type: 'datetime' })
    fecha_apertura: Date;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    monto_apertura: number;

    @Column({ type: 'datetime', nullable: true })
    fecha_cierre: Date;

    @Column({ type: 'decimal', precision: 11, scale: 2, nullable: true })
    monto_cierre_esperado: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, nullable: true })
    monto_cierre_real: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    monto_ventas_efectivo: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    monto_ingresos_manual: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    monto_egresos_manual: number;

    @Column({ type: 'enum', enum: ['Abierta', 'Cerrada'], default: 'Abierta' })
    estado: string;

    @Column({ type: 'text', nullable: true })
    observaciones: string;

    @ManyToOne(() => Caja)
    @JoinColumn({ name: 'idcaja' })
    caja: Caja;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idusuario' })
    usuario: Usuario;

    @OneToMany(() => CajaMovimiento, (m) => m.sesion)
    movimientos: CajaMovimiento[];
}
