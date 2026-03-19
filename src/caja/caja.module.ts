import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caja } from '../entities/caja.entity';
import { CajaSesion } from '../entities/caja-sesion.entity';
import { CajaMovimiento } from '../entities/caja-movimiento.entity';
import { CajaController } from './caja.controller';
import { CajaService } from './caja.service';
import { TemplatesModule } from '../templates/templates.module';

@Module({
    imports: [TypeOrmModule.forFeature([Caja, CajaSesion, CajaMovimiento]), TemplatesModule],
    controllers: [CajaController],
    providers: [CajaService],
    exports: [CajaService],
})
export class CajaModule { }
