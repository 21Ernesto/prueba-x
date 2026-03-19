import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type PlantillaTipo = 'TICKET' | 'A4' | 'CUADRE' | 'COTIZACION' | 'OTRO';

@Entity('plantilla_comprobante')
export class PlantillaComprobante {
    @PrimaryGeneratedColumn()
    idplantilla: number;

    @Column({ length: 150 })
    nombre: string;

    @Column({ type: 'int', nullable: true })
    idcomprobante: number | null;

    @Column({ type: 'int', nullable: true })
    idtipopago: number | null;

    @Column({ type: 'varchar', length: 10, default: 'TICKET' })
    tipo: PlantillaTipo;

    @Column({ type: 'longtext' })
    html: string;

    @Column({ type: 'tinyint', default: 1 })
    activo: number;

    @CreateDateColumn({ type: 'datetime' })
    created_at: Date;

    @UpdateDateColumn({ type: 'datetime' })
    updated_at: Date;
}
