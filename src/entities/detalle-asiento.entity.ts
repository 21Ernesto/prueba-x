import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AsientoContable } from './asiento-contable.entity';
import { PlanCuentas } from './plan-cuentas.entity';

@Entity('detalle_asientos')
export class DetalleAsiento {
    @PrimaryGeneratedColumn()
    iddetalle: number;

    @Column()
    idasiento: number;

    @Column()
    idcuenta: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    debe: number;

    @Column({ type: 'decimal', precision: 11, scale: 2, default: 0 })
    haber: number;

    @ManyToOne(() => AsientoContable, (a) => a.detalles, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'idasiento' })
    asiento: AsientoContable;

    @ManyToOne(() => PlanCuentas)
    @JoinColumn({ name: 'idcuenta' })
    cuenta: PlanCuentas;
}
