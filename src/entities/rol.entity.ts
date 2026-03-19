import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import { Permiso } from './permiso.entity';

@Entity('rol')
export class Rol {
    @PrimaryGeneratedColumn()
    idrol: number;

    @Column({ length: 30 })
    nombre: string;

    @Column({ length: 255, nullable: true })
    descripcion: string;

    @Column({ default: 1 })
    estado: number;

    @ManyToMany(() => Permiso)
    @JoinTable({
        name: 'rol_permiso',
        joinColumn: { name: 'idrol', referencedColumnName: 'idrol' },
        inverseJoinColumn: { name: 'idpermiso', referencedColumnName: 'idpermiso' },
    })
    permisos: Permiso[];
}
