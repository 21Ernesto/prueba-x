import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';

@Entity('cajas')
export class Caja {
    @PrimaryGeneratedColumn()
    idcaja: number;

    @Column({ length: 100 })
    nombre: string;

    @Column({ type: 'text', nullable: true })
    descripcion: string;

    @Column({ default: 1 })
    estado: number;
    @Column({ nullable: true })
    idsucursal: number;

    @ManyToOne('Sucursal')
    @JoinColumn({ name: 'idsucursal' })
    sucursal: any;
}
