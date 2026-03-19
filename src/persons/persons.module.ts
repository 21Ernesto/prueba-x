import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Persona } from '../entities/persona.entity';
import { PersonsController } from './persons.controller';
import { PersonsService } from './persons.service';

@Module({
    imports: [TypeOrmModule.forFeature([Persona])],
    controllers: [PersonsController],
    providers: [PersonsService],
    exports: [PersonsService],
})
export class PersonsModule { }
