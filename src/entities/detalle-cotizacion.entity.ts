import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Cotizacion } from './cotizacion.entity';
import { Articulo } from './articulo.entity';

@Entity('detalle_cotizacion')
export class DetalleCotizacion {
    @PrimaryGeneratedColumn()
    iddetalle_cotizacion: number;

    @Column()
    idcotizacion: number;

    @Column()
    idarticulo: number;

    @Column()
    cantidad: number;

    @Column({ type: 'decimal', precision: 11, scale: 2 })
    precio_venta: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    descuento: number;

    @Column({ length: 32, nullable: true })
    imei: string;

    @ManyToOne(() => Cotizacion, (c) => c.detalles)
    @JoinColumn({ name: 'idcotizacion' })
    cotizacion: Cotizacion;

    @ManyToOne(() => Articulo)
    @JoinColumn({ name: 'idarticulo' })
    articulo: Articulo;
}
