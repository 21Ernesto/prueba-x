import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { Articulo } from './articulo.entity';
import { Ingreso } from './ingreso.entity';
import { Venta } from './venta.entity';

@Entity('articulo_imei')
export class ArticuloImei {
    @PrimaryGeneratedColumn()
    idarticulo_imei: number;

    @Column()
    idarticulo: number;

    @Column({ length: 32 })
    imei: string;

    @Column({ nullable: true })
    idingreso: number | null;

    @Column({ nullable: true })
    idventa: number | null;

    @ManyToOne(() => Articulo, (a) => (a as any).imeis, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'idarticulo' })
    articulo: Articulo;

    @ManyToOne(() => Ingreso, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'idingreso' })
    ingreso: Ingreso;

    @ManyToOne(() => Venta, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'idventa' })
    venta: Venta;
}
