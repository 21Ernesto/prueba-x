import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Persona } from './persona.entity';
import { Usuario } from './usuario.entity';
import { DetalleVenta } from './detalle-venta.entity';
import { Caja } from './caja.entity';

@Entity('venta')
export class Venta {
    @PrimaryGeneratedColumn()
    idventa: number;

    @Column({ nullable: true })
    idcliente: number;

    @Column()
    idusuario: number;

    @Column({ length: 45, nullable: true })
    tipo_comprobante: string;

    @Column({ length: 7, nullable: true })
    serie_comprobante: string;

    @Column({ length: 10, nullable: true })
    num_comprobante: string;

    @Column({ type: 'datetime' })
    fecha_hora: Date;

    @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
    impuesto: number;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    total_venta: number;

    @Column({ length: 45, nullable: true })
    tipo_pago: string;

    @Column({ length: 45, nullable: true })
    num_transac: string;

    @Column({ length: 20, default: 'Aceptado' })
    estado: string;

    @Column({ nullable: true })
    idsucursal: number;

    @Column({ default: 1 })
    idcaja: number;

    @ManyToOne(() => Persona)
    @JoinColumn({ name: 'idcliente' })
    cliente: Persona;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idusuario' })
    usuario: Usuario;

    @ManyToOne(() => Caja)
    @JoinColumn({ name: 'idcaja' })
    caja: Caja;

    @ManyToOne('Sucursal')
    @JoinColumn({ name: 'idsucursal' })
    sucursal: any;

    @OneToMany(() => DetalleVenta, (d) => d.venta)
    detalles: DetalleVenta[];
}
