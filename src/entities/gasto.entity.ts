import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';

@Entity('gastos')
export class Gasto {
    @PrimaryGeneratedColumn()
    idgasto: number;

    @Column({ type: 'datetime' })
    fecha: Date;

    @Column({ length: 100, nullable: true })
    referencia: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    monto: number;

    @Column({ default: 1 })
    condicion: number;

    @Column()
    idusuario: number;

    @Column({ nullable: true })
    idsucursal: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idusuario' })
    usuario: Usuario;

    @ManyToOne('Sucursal')
    @JoinColumn({ name: 'idsucursal' })
    sucursal: any;
}
