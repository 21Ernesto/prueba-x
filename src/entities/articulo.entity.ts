import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Categoria } from './categoria.entity';
import { ArticuloImei } from './articulo-imei.entity';
import { Persona } from './persona.entity';

@Entity('articulo')
export class Articulo {
    @PrimaryGeneratedColumn()
    idarticulo: number;

    @Column()
    idcategoria: number;

    @Column({ length: 50, nullable: true })
    codigo: string;

    @Column({ length: 100, unique: true })
    nombre: string;

    @Column({ default: 0 })
    es_telefono: number;

    @Column({ default: 0 })
    stock_minimo: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    precio_compra: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    precio_venta: number;

    @Column({ nullable: true })
    idproveedor: number;

    @Column({ length: 256, nullable: true })
    descripcion: string;

    @Column({ length: 100, nullable: true })
    imagen: string;

    @Column({ default: 1 })
    condicion: number;

    @ManyToOne(() => Categoria)
    @JoinColumn({ name: 'idcategoria' })
    categoria: Categoria;

    @ManyToOne(() => Persona)
    @JoinColumn({ name: 'idproveedor' })
    proveedor: Persona;

    @OneToMany(() => ArticuloImei, (i) => i.articulo, { cascade: true })
    imeis: ArticuloImei[];

    @OneToMany('ArticuloStock', 'articulo')
    stocks: any[];
}

