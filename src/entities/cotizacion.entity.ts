import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Persona } from './persona.entity';
import { Usuario } from './usuario.entity';
import { CompPago } from './comp-pago.entity';
import { DetalleCotizacion } from './detalle-cotizacion.entity';

@Entity('cotizacion')
export class Cotizacion {
    @PrimaryGeneratedColumn()
    idcotizacion: number;

    @Column({ nullable: true })
    idcliente: number;

    @Column()
    idusuario: number;

    @Column({ nullable: true })
    idcomprobante: number;

    @Column({ length: 7, nullable: true })
    serie_comprobante: string;

    @Column({ length: 10, nullable: true })
    num_comprobante: string;

    @Column({ type: 'datetime' })
    fecha_hora: Date;

    @Column({ type: 'decimal', precision: 4, scale: 2, default: 0 })
    impuesto: number;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    total: number;

    @Column({ default: 5 })
    validez_dias: number;

    @Column({ length: 20, default: 'Pendiente' })
    estado: string;

    @Column({ nullable: true })
    idsucursal: number;

    @ManyToOne(() => Persona)
    @JoinColumn({ name: 'idcliente' })
    cliente: Persona;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idusuario' })
    usuario: Usuario;

    @ManyToOne('Sucursal')
    @JoinColumn({ name: 'idsucursal' })
    sucursal: any;

    @ManyToOne(() => CompPago)
    @JoinColumn({ name: 'idcomprobante' })
    comprobante: CompPago;

    @OneToMany(() => DetalleCotizacion, (d) => d.cotizacion, { cascade: true })
    detalles: DetalleCotizacion[];
}
