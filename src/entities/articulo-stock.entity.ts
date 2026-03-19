import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Articulo } from './articulo.entity';
import { Sucursal } from './sucursal.entity';

@Entity('articulo_stock')
@Unique(['idarticulo', 'idsucursal'])
export class ArticuloStock {
    @PrimaryGeneratedColumn()
    idarticulostock: number;

    @Column()
    idarticulo: number;

    @Column()
    idsucursal: number;

    @Column({ default: 0 })
    stock: number;

    @ManyToOne(() => Articulo)
    @JoinColumn({ name: 'idarticulo' })
    articulo: Articulo;

    @ManyToOne(() => Sucursal)
    @JoinColumn({ name: 'idsucursal' })
    sucursal: Sucursal;
}
