import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('moneda')
export class Moneda {
    @PrimaryGeneratedColumn()
    idmoneda: number;

    @Column({ length: 10, unique: true })
    codigo: string;

    @Column({ length: 50 })
    nombre: string;

    @Column({ length: 10, default: '' })
    simbolo: string;

    @Column({ default: 1 })
    estado: number;
}
