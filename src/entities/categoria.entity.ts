import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('categoria')
export class Categoria {
    @PrimaryGeneratedColumn()
    idcategoria: number;

    @Column({ length: 50, unique: true })
    nombre: string;

    @Column({ length: 256, nullable: true })
    descripcion: string;

    @Column({ default: 1 })
    condicion: number;
}
