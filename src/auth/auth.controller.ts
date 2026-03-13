import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '../authorization/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ResponseMessage('Login successful.')
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const tokenPair = await this.authService.login(
      loginDto,
      request.ip ?? 'unknown',
    );

    response.cookie(
      this.authService.getRefreshCookieName(),
      tokenPair.refreshToken,
      {
        httpOnly: true,
        secure: this.authService.getCookieSecure(),
        sameSite: 'lax',
        maxAge: tokenPair.refreshTokenMaxAgeMs,
        path: '/',
      },
    );

    return { accessToken: tokenPair.accessToken };
  }

  @Post('refresh')
  @ResponseMessage('Access token refreshed successfully.')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ accessToken: string }> {
    const refreshToken = this.extractRefreshToken(request);
    const tokenPair = await this.authService.refresh(refreshToken);

    response.cookie(
      this.authService.getRefreshCookieName(),
      tokenPair.refreshToken,
      {
        httpOnly: true,
        secure: this.authService.getCookieSecure(),
        sameSite: 'lax',
        maxAge: tokenPair.refreshTokenMaxAgeMs,
        path: '/',
      },
    );

    return { accessToken: tokenPair.accessToken };
  }

  @Post('logout')
  @ResponseMessage('Logout successful.')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ success: true }> {
    const refreshToken = this.extractRefreshToken(request);

    await this.authService.logout(refreshToken);

    response.clearCookie(this.authService.getRefreshCookieName(), {
      httpOnly: true,
      secure: this.authService.getCookieSecure(),
      sameSite: 'lax',
      path: '/',
    });

    return { success: true };
  }

  private extractRefreshToken(request: Request): string | undefined {
    const cookieName = this.authService.getRefreshCookieName();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const cookieValue = cookies?.[cookieName];

    return typeof cookieValue === 'string' ? cookieValue : undefined;
  }
}
