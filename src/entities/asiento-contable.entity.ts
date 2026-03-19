import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Usuario } from './usuario.entity';
import { DetalleAsiento } from './detalle-asiento.entity';

@Entity('asientos_contables')
export class AsientoContable {
    @PrimaryGeneratedColumn()
    idasiento: number;

    @Column({ type: 'datetime' })
    fecha: Date;

    @Column({ length: 20, unique: true })
    numero_asiento: string;

    @Column({ type: 'enum', enum: ['venta', 'compra', 'gasto', 'ajuste', 'apertura'] })
    tipo_documento: string;

    @Column({ nullable: true })
    id_documento: number;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    total_debe: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    total_haber: number;

    @Column()
    idusuario: number;

    @Column({ default: 1 })
    condicion: number;

    @Column({ nullable: true })
    idsucursal: number;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idusuario' })
    usuario: Usuario;

    @ManyToOne('Sucursal')
    @JoinColumn({ name: 'idsucursal' })
    sucursal: any;

    @OneToMany(() => DetalleAsiento, (d) => d.asiento)
    detalles: DetalleAsiento[];
}
