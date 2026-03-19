import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('comp_pago')
export class CompPago {
    @PrimaryGeneratedColumn()
    id_comp_pago: number;

    @Column({ length: 45 })
    nombre: string;

    @Column({ length: 3, nullable: true })
    letra_serie: string;

    @Column({ length: 3, nullable: true })
    serie_comprobante: string;

    @Column({ length: 10, nullable: true })
    num_comprobante: string;

    @Column({ default: 1 })
    condicion: number;
}
