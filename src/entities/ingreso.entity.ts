import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Persona } from './persona.entity';
import { Usuario } from './usuario.entity';
import { DetalleIngreso } from './detalle-ingreso.entity';

@Entity('ingreso')
export class Ingreso {
    @PrimaryGeneratedColumn()
    idingreso: number;

    @Column()
    idproveedor: number;

    @Column()
    idusuario: number;

    @Column({ length: 20, nullable: true })
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
    total_compra: number;

    @Column({ length: 20, default: 'Aceptado' })
    estado: string;

    @Column({ nullable: true })
    idsucursal: number;

    @ManyToOne(() => Persona)
    @JoinColumn({ name: 'idproveedor' })
    proveedor: Persona;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idusuario' })
    usuario: Usuario;

    @ManyToOne('Sucursal')
    @JoinColumn({ name: 'idsucursal' })
    sucursal: any;

    @OneToMany(() => DetalleIngreso, (d) => d.ingreso)
    detalles: DetalleIngreso[];
}
