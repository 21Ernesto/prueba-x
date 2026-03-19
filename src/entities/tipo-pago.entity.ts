import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('tipo_pago')
export class TipoPago {
    @PrimaryGeneratedColumn()
    idtipopago: number;

    @Column({ length: 45 })
    nombre: string;

    @Column({ length: 100, nullable: true })
    descripcion: string;

    @Column({ default: 1 })
    estado: number;
}
