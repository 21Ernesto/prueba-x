import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Venta } from './venta.entity';
import { Articulo } from './articulo.entity';

@Entity('detalle_venta')
export class DetalleVenta {
    @PrimaryGeneratedColumn()
    iddetalle_venta: number;

    @Column()
    idventa: number;

    @Column()
    idarticulo: number;

    @Column()
    cantidad: number;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    precio_compra: number;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    precio_venta: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    descuento: number;

    @Column({ length: 32, nullable: true })
    imei: string;

    @Column({ default: 1 })
    estado: number;

    @ManyToOne(() => Venta, (v) => v.detalles)
    @JoinColumn({ name: 'idventa' })
    venta: Venta;

    @ManyToOne(() => Articulo)
    @JoinColumn({ name: 'idarticulo' })
    articulo: Articulo;
}
