import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('sucursal')
export class Sucursal {
    @PrimaryGeneratedColumn()
    idsucursal: number;

    @Column({ length: 100 })
    nombre: string;

    @Column({ length: 256, nullable: true })
    direccion: string;

    @Column({ length: 20, nullable: true })
    telefono: string;

    @Column({ default: 1 })
    condicion: number;
}
