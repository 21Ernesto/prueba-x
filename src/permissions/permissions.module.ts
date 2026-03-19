import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permiso } from '../entities/permiso.entity';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
class PermissionsController {
    constructor(@InjectRepository(Permiso) private repo: Repository<Permiso>) { }

    @Get()
    findAll() {
        return this.repo.find();
    }
}

@Module({
    imports: [TypeOrmModule.forFeature([Permiso])],
    controllers: [PermissionsController],
})
export class PermissionsModule { }
