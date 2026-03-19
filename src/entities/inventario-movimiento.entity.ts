import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Articulo } from './articulo.entity';
import { Sucursal } from './sucursal.entity';
import { Usuario } from './usuario.entity';

@Entity('inventario_movimiento')
export class InventarioMovimiento {
    @PrimaryGeneratedColumn()
    idmovimiento: number;

    @Column()
    idarticulo: number;

    @Column()
    idsucursal: number;

    @Column()
    idusuario: number;

    @Column({ length: 50 })
    tipo: 'VENTA' | 'COMPRA' | 'AJUSTE' | 'TRASLADO_ENTRADA' | 'TRASLADO_SALIDA';

    @Column({ nullable: true })
    idreferencia: number; // ID de venta, compra, etc.

    @Column({ type: 'int' })
    cantidad: number;

    @Column({ type: 'int' })
    stock_anterior: number;

    @Column({ type: 'int' })
    stock_actual: number;

    @Column({ length: 256, nullable: true })
    motivo: string;

    @CreateDateColumn()
    fecha: Date;

    @ManyToOne(() => Articulo)
    @JoinColumn({ name: 'idarticulo' })
    articulo: Articulo;

    @ManyToOne(() => Sucursal)
    @JoinColumn({ name: 'idsucursal' })
    sucursal: Sucursal;

    @ManyToOne(() => Usuario)
    @JoinColumn({ name: 'idusuario' })
    usuario: Usuario;
}
