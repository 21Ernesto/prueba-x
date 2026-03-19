import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseSeederService } from './database-seeder.service';
import { Usuario } from '../entities/usuario.entity';
import { Rol } from '../entities/rol.entity';
import { Permiso } from '../entities/permiso.entity';
import { Sucursal } from '../entities/sucursal.entity';
import { Caja } from '../entities/caja.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Usuario, Rol, Permiso, Sucursal, Caja]),
    ],
    providers: [DatabaseSeederService],
    exports: [DatabaseSeederService],
})
export class DatabaseSeederModule {}
