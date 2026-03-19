import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sucursal } from '../entities/sucursal.entity';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';

@Module({
    imports: [TypeOrmModule.forFeature([Sucursal])],
    controllers: [BranchesController],
    providers: [BranchesService],
    exports: [BranchesService],
})
export class BranchesModule { }
