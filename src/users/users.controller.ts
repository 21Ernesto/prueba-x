import {
    Controller, Get, Post, Put, Patch, Body, Param,
    UseGuards, UploadedFile, UseInterceptors, ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/user.decorator';
import { UsersService } from './users.service';
import { ChangePasswordDto, CreateUserDto, UpdateUserDto } from './dto/user.dto';

const imageStorage = diskStorage({
    destination: './uploads/users',
    filename: (_, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + extname(file.originalname));
    },
});

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Get()
    @RequirePermissions('acceso_usuarios')
    findAll(@CurrentUser() user: any) {
        return this.usersService.findAll(user.idsucursal);
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.findOne(id);
    }

    @Post()
    @RequirePermissions('acceso_usuarios')
    @UseInterceptors(FileInterceptor('imagen', { storage: imageStorage }))
    create(@Body() dto: CreateUserDto, @CurrentUser() user: any, @UploadedFile() file?: Express.Multer.File) {
        return this.usersService.create({ ...dto, idsucursal: dto.idsucursal || user.idsucursal }, file?.filename);
    }

    @Put(':id')
    @RequirePermissions('acceso_usuarios')
    @UseInterceptors(FileInterceptor('imagen', { storage: imageStorage }))
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateUserDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.usersService.update(id, dto, file?.filename);
    }

    @Put('profile/me')
    @UseInterceptors(FileInterceptor('imagen', { storage: imageStorage }))
    updateProfile(
        @CurrentUser('idusuario') uid: number,
        @Body() dto: UpdateUserDto,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.usersService.updateProfile(uid, dto, file?.filename);
    }

    @Patch(':id/deactivate')
    @RequirePermissions('acceso_usuarios')
    deactivate(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.deactivate(id);
    }

    @Patch(':id/activate')
    @RequirePermissions('acceso_usuarios')
    activate(@Param('id', ParseIntPipe) id: number) {
        return this.usersService.activate(id);
    }

    @Patch(':id/change-password')
    changePassword(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: ChangePasswordDto,
    ) {
        return this.usersService.changePassword(id, body.clave_actual, body.clave_nueva);
    }
}
