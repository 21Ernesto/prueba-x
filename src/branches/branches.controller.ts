import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('sucursales')
export class BranchesController {
    constructor(private readonly branchesService: BranchesService) { }

    @Get()
    findAll() {
        return this.branchesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.branchesService.findOne(+id);
    }

    @Post()
    create(@Body() data: any) {
        return this.branchesService.create(data);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() data: any) {
        return this.branchesService.update(+id, data);
    }

    @Delete(':id')
    deactivate(@Param('id') id: string) {
        return this.branchesService.deactivate(+id);
    }
}
