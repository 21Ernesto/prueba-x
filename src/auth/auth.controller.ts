import { Controller, Post, Body, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }
    
    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getProfile(@Request() req) {
        // req.user.idusuario
        return this.authService.getProfileWithPermissions(req.user.sub);
    }
}

