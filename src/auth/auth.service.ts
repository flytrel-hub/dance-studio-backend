import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../config/prisma.service';
import { LoginDto, RegisterDto, RefreshTokenDto, ChangePasswordDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true, client: true, trainer: true },
    });

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role.name);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        fullName: user.client?.fullName || user.trainer?.fullName || user.email,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const clientRole = await this.prisma.userRole.findUnique({ where: { name: 'CLIENT' } });
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role_id: clientRole.id,
      },
    });

    await this.prisma.client.create({
      data: {
        user_id: user.id,
        fullName: dto.fullName,
        phone: dto.phone,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email, 'CLIENT');
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: dto.email,
        role: 'CLIENT',
        fullName: dto.fullName,
      },
    };
  }

  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true, client: true, trainer: true },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Access denied');
      }

      const rtMatches = await bcrypt.compare(dto.refreshToken, user.refreshToken);
      if (!rtMatches) {
        throw new UnauthorizedException('Access denied');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role.name);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          role: user.role.name,
          fullName: user.client?.fullName || user.trainer?.fullName || user.email,
        },
      };
    } catch {
      throw new UnauthorizedException('Access denied');
    }
  }

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    const isPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный пароль');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Пароль успешно изменен' };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, client: true, trainer: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role.name,
      clientId: user.client?.id || null,
      trainerId: user.trainer?.id || null,
      fullName: user.client?.fullName || user.trainer?.fullName || user.email,
      phone: user.client?.phone || user.trainer?.phone,
      specialization: user.trainer?.specialization,
      avatarUrl: user.client?.avatarUrl || user.trainer?.avatarUrl || null,
      createdAt: user.createdAt,
    };
  }

  async updateAvatar(userId: number, avatarUrl: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { client: true, trainer: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    if (user.client) {
      await this.prisma.client.update({
        where: { id: user.client.id },
        data: { avatarUrl },
      });
    } else if (user.trainer) {
      await this.prisma.trainer.update({
        where: { id: user.trainer.id },
        data: { avatarUrl },
      });
    }

    return { message: 'Аватар обновлен', avatarUrl };
  }

  private async generateTokens(userId: number, email: string, role: string) {
    const payload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: number, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashedRefreshToken },
    });
  }
}
