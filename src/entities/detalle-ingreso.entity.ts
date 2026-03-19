import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Ingreso } from './ingreso.entity';
import { Articulo } from './articulo.entity';

@Entity('detalle_ingreso')
export class DetalleIngreso {
    @PrimaryGeneratedColumn()
    iddetalle_ingreso: number;

    @Column()
    idingreso: number;

    @Column()
    idarticulo: number;

    @Column()
    cantidad: number;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    precio_compra: number;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    precio_venta: number;

    @Column({ default: 1 })
    estado: number;

    @ManyToOne(() => Ingreso, (i) => i.detalles)
    @JoinColumn({ name: 'idingreso' })
    ingreso: Ingreso;

    @ManyToOne(() => Articulo)
    @JoinColumn({ name: 'idarticulo' })
    articulo: Articulo;
}
