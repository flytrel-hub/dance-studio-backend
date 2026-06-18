import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });

    return users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role.name,
      createdAt: u.createdAt,
    }));
  }
}
