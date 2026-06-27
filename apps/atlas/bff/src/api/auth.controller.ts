import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { z } from 'zod';
import { AuthService } from '../application/auth.service.js';
import { LoginDto, RefreshDto, RegisterDto } from './dto.js';
import { ZodBody } from './zod.pipe.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body(new ZodBody(RegisterDto)) dto: z.infer<typeof RegisterDto>) {
    return this.auth.register(dto);
  }

  @Post('login')
  @HttpCode(200)
  login(@Body(new ZodBody(LoginDto)) dto: z.infer<typeof LoginDto>) {
    return this.auth.login(dto.username, dto.password);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body(new ZodBody(RefreshDto)) dto: z.infer<typeof RefreshDto>) {
    return this.auth.refresh(dto.refreshToken);
  }
}
