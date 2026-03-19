import { IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import type { PlantillaTipo } from '../../entities/plantilla-comprobante.entity';

export class CreateTemplateDto {
    @IsString()
    @MinLength(1)
    nombre: string;

    @IsOptional()
    @IsInt()
    idcomprobante?: number | null;

    @IsOptional()
    @IsInt()
    idtipopago?: number | null;

    @IsString()
    @IsIn(['TICKET', 'A4', 'CUADRE', 'COTIZACION', 'OTRO'] satisfies PlantillaTipo[])
    tipo: PlantillaTipo;

    @IsString()
    @MinLength(1)
    html: string;

    @IsOptional()
    @IsInt()
    activo?: number;
}

export class UpdateTemplateDto {
    @IsOptional()
    @IsString()
    @MinLength(1)
    nombre?: string;

    @IsOptional()
    @IsInt()
    idcomprobante?: number | null;

    @IsOptional()
    @IsInt()
    idtipopago?: number | null;

    @IsOptional()
    @IsString()
    @IsIn(['TICKET', 'A4', 'CUADRE', 'COTIZACION', 'OTRO'] satisfies PlantillaTipo[])
    tipo?: PlantillaTipo;

    @IsOptional()
    @IsString()
    @MinLength(1)
    html?: string;

    @IsOptional()
    @IsInt()
    activo?: number;
}

export class PreviewTemplateDto {
    @IsString()
    @MinLength(1)
    html: string;

    @IsOptional()
    @IsInt()
    ventaId?: number;

    @IsOptional()
    @IsString()
    @IsIn(['TICKET', 'A4', 'CUADRE', 'COTIZACION', 'OTRO'] satisfies PlantillaTipo[])
    tipo?: PlantillaTipo;
}
