import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatosNegocio } from '../entities/datos-negocio.entity';

@Module({
    imports: [TypeOrmModule.forFeature([DatosNegocio])],
})
export class CompanyModule { }
