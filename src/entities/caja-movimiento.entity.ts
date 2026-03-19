import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { CajaSesion } from './caja-sesion.entity';

@Entity('caja_movimientos')
export class CajaMovimiento {
    @PrimaryGeneratedColumn()
    id_movimiento: number;

    @Column()
    idp_caja: number;

    @Column({ type: 'enum', enum: ['Ingreso', 'Egreso'] })
    tipo: string;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    monto: number;

    @Column({ length: 255, nullable: true })
    descripcion: string;

    @Column({ type: 'datetime' })
    fecha_hora: Date;

    @ManyToOne(() => CajaSesion, (s) => s.movimientos, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'idp_caja' })
    sesion: CajaSesion;
}
