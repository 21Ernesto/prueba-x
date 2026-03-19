import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('permiso')
export class Permiso {
    @PrimaryGeneratedColumn()
    idpermiso: number;

    @Column({ length: 30 })
    nombre: string;

    @Column({ length: 50 })
    clave: string;

    @Column({ length: 50, nullable: true })
    grupo: string;
}
