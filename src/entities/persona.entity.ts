import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('persona')
export class Persona {
    @PrimaryGeneratedColumn()
    idpersona: number;

    @Column({ length: 20 })
    tipo_persona: string; // 'Cliente' | 'Proveedor'

    @Column({ length: 100 })
    nombre: string;

    @Column({ length: 20, nullable: true })
    tipo_documento: string;

    @Column({ length: 20, nullable: true })
    num_documento: string;

    @Column({ length: 70, nullable: true })
    direccion: string;

    @Column({ length: 20, nullable: true })
    telefono: string;

    @Column({ length: 50, nullable: true })
    email: string;
}
