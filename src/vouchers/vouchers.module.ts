import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompPago } from '../entities/comp-pago.entity';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('vouchers')
class VouchersController2 { constructor() { } }
// Re-exported via PaymentsTypeModule - this module wires it
@Module({
    imports: [TypeOrmModule.forFeature([CompPago])],
})
export class VouchersModule { }
