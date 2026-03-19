import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Rol } from './rol.entity';
import { Caja } from './caja.entity';

@Entity('usuario')
export class Usuario {
    @PrimaryGeneratedColumn()
    idusuario: number;

    @Column({ nullable: true })
    idrol: number;

    @Column({ nullable: true })
    idpadre: number;

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

    @Column({ length: 20, nullable: true })
    cargo: string;

    @Column({ length: 20, unique: true })
    login: string;

    @Column({ length: 64 })
    clave: string;

    @Column({ length: 100, nullable: true })
    imagen: string;

    @Column({ length: 254, nullable: true })
    descripcion: string;

    @Column({ type: 'text', nullable: true })
    biografia: string;

    @Column({ default: 1 })
    condicion: number;

    @Column({ nullable: true })
    idcaja: number;

    @Column({ nullable: true })
    idsucursal: number;

    @ManyToOne(() => Rol)
    @JoinColumn({ name: 'idrol' })
    rol: Rol;

    @ManyToOne(() => Caja)
    @JoinColumn({ name: 'idcaja' })
    caja: Caja;

    @ManyToOne('Sucursal')
    @JoinColumn({ name: 'idsucursal' })
    sucursal: any;
}
