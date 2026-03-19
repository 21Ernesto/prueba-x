import { IsString, IsOptional, IsNumber, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    nombre: string;

    @IsString()
    @IsOptional()
    tipo_documento?: string;

    @IsString()
    @IsOptional()
    num_documento?: string;

    @IsString()
    @IsOptional()
    direccion?: string;

    @IsString()
    @IsOptional()
    telefono?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    login: string;

    @IsString()
    @MinLength(4)
    clave: string;

    @IsNumber()
    idrol: number;

    @IsNumber()
    @IsOptional()
    idcaja?: number;

    @IsNumber()
    @IsOptional()
    idpadre?: number;

    @IsString()
    @IsOptional()
    cargo?: string;

    @IsNumber()
    @IsOptional()
    idsucursal?: number;
}

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    nombre?: string;

    @IsString()
    @IsOptional()
    tipo_documento?: string;

    @IsString()
    @IsOptional()
    num_documento?: string;

    @IsString()
    @IsOptional()
    direccion?: string;

    @IsString()
    @IsOptional()
    telefono?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    @MinLength(4)
    clave?: string;

    @IsNumber()
    @IsOptional()
    idrol?: number;

    @IsNumber()
    @IsOptional()
    idcaja?: number;

    @IsNumber()
    @IsOptional()
    idpadre?: number;

    @IsString()
    @IsOptional()
    cargo?: string;

    @IsNumber()
    @IsOptional()
    idsucursal?: number;
}

export class ChangePasswordDto {
    @IsString()
    @MinLength(1)
    clave_actual: string;

    @IsString()
    @MinLength(4)
    clave_nueva: string;
}
