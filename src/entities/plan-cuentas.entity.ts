import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';

@Entity('plan_cuentas')
export class PlanCuentas {
    @PrimaryGeneratedColumn()
    idcuenta: number;

    @Column({ length: 20, unique: true })
    codigo: string;

    @Column({ length: 200 })
    nombre: string;

    @Column({ type: 'enum', enum: ['ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'GASTO'] })
    tipo: string;

    @Column({ type: 'enum', enum: ['DEBITO', 'CREDITO'] })
    naturaleza: string;

    @Column({ type: 'tinyint', default: 2 })
    nivel: number;

    @Column({ nullable: true })
    padre_id: number;

    @Column({ default: 1 })
    condicion: number;

    @ManyToOne(() => PlanCuentas)
    @JoinColumn({ name: 'padre_id' })
    padre: PlanCuentas;
}
