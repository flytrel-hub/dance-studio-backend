import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../config/prisma.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { search?: string; page?: number; limit?: number }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { user: { email: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        include: { user: { select: { email: true } } },
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items: items.map(c => ({
        id: c.id,
        fullName: c.fullName,
        phone: c.phone,
        email: c.user.email,
        birthDate: c.birthDate,
        gender: c.gender,
        comment: c.comment,
        avatarUrl: c.avatarUrl,
        registeredAt: c.registeredAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        groupMembers: { include: { group: true } },
        subscriptions: { orderBy: { startDate: 'desc' } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    return {
      id: client.id,
      fullName: client.fullName,
      phone: client.phone,
      email: client.user.email,
      birthDate: client.birthDate,
      gender: client.gender,
      comment: client.comment,
      avatarUrl: client.avatarUrl,
      registeredAt: client.registeredAt,
      groups: client.groupMembers.map(gm => gm.group),
      subscriptions: client.subscriptions,
      payments: client.payments,
    };
  }

  async create(dto: CreateClientDto) {
    const clientRole = await this.prisma.userRole.findUnique({ where: { name: 'CLIENT' } });
    const password = dto.password || 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role_id: clientRole.id,
      },
    });

    const client = await this.prisma.client.create({
      data: {
        user_id: user.id,
        fullName: dto.fullName,
        phone: dto.phone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        gender: dto.gender as any,
        comment: dto.comment,
      },
      include: { user: { select: { email: true } } },
    });

    return {
      id: client.id,
      fullName: client.fullName,
      phone: client.phone,
      email: client.user.email,
      birthDate: client.birthDate,
      gender: client.gender,
      comment: client.comment,
      registeredAt: client.registeredAt,
    };
  }

  async update(id: number, dto: UpdateClientDto) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    if (dto.email) {
      await this.prisma.user.update({
        where: { id: client.user_id },
        data: { email: dto.email },
      });
    }

    const updated = await this.prisma.client.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender as any,
        comment: dto.comment,
      },
      include: { user: { select: { email: true } } },
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      phone: updated.phone,
      email: updated.user.email,
      birthDate: updated.birthDate,
      gender: updated.gender,
      comment: updated.comment,
      registeredAt: updated.registeredAt,
    };
  }

  async remove(id: number) {
    const client = await this.prisma.client.findUnique({ where: { id } });
    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    await this.prisma.user.delete({ where: { id: client.user_id } });
    return { message: 'Клиент удален' };
  }
}
