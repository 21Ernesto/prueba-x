import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('datos_negocio')
export class DatosNegocio {
    @PrimaryGeneratedColumn()
    id_negocio: number;

    @Column({ length: 80 })
    nombre: string;

    @Column({ length: 20, nullable: true })
    ndocumento: string;

    @Column({ nullable: true })
    documento: number;

    @Column({ length: 100, nullable: true })
    direccion: string;

    @Column({ nullable: true })
    telefono: string;

    @Column({ length: 100, nullable: true })
    email: string;

    @Column({ length: 100, nullable: true })
    logo: string;

    @Column({ length: 50, nullable: true })
    pais: string;

    @Column({ length: 50, nullable: true })
    ciudad: string;

    @Column({ length: 10, nullable: true })
    nombre_impuesto: string;

    @Column({ type: 'float', default: 0 })
    monto_impuesto: number;

    @Column({ length: 10, nullable: true })
    moneda: string;

    @Column({ length: 10, default: '$' })
    simbolo: string;

    @Column({ default: 1 })
    condicion: number;

    @Column({ length: 60, nullable: true, default: 'America/Guayaquil' })
    zona_horaria: string;
}
