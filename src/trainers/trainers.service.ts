import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../config/prisma.service';
import { CreateTrainerDto, UpdateTrainerDto } from './dto/trainer.dto';

@Injectable()
export class TrainersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const trainers = await this.prisma.trainer.findMany({
      include: { user: { select: { email: true } }, groups: true },
      orderBy: { fullName: 'asc' },
    });

    return trainers.map(t => ({
      id: t.id,
      fullName: t.fullName,
      phone: t.phone,
      email: t.user.email,
      specialization: t.specialization,
      description: t.description,
      groups: t.groups,
    }));
  }

  async findOne(id: number) {
    const trainer = await this.prisma.trainer.findUnique({
      where: { id },
      include: {
        user: { select: { email: true } },
        groups: { include: { groupMembers: { include: { client: true } } } },
        lessons: { orderBy: { lessonDate: 'desc' }, take: 10 },
      },
    });

    if (!trainer) {
      throw new NotFoundException('Тренер не найден');
    }

    return {
      id: trainer.id,
      fullName: trainer.fullName,
      phone: trainer.phone,
      email: trainer.user.email,
      specialization: trainer.specialization,
      description: trainer.description,
      groups: trainer.groups,
      recentLessons: trainer.lessons,
    };
  }

  async create(dto: CreateTrainerDto) {
    const trainerRole = await this.prisma.userRole.findUnique({ where: { name: 'TRAINER' } });
    const password = dto.password || 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        role_id: trainerRole.id,
      },
    });

    const trainer = await this.prisma.trainer.create({
      data: {
        user_id: user.id,
        fullName: dto.fullName,
        phone: dto.phone,
        specialization: dto.specialization,
        description: dto.description,
      },
      include: { user: { select: { email: true } } },
    });

    return {
      id: trainer.id,
      fullName: trainer.fullName,
      phone: trainer.phone,
      email: trainer.user.email,
      password,
      specialization: trainer.specialization,
      description: trainer.description,
    };
  }

  async update(id: number, dto: UpdateTrainerDto) {
    const trainer = await this.prisma.trainer.findUnique({ where: { id } });
    if (!trainer) {
      throw new NotFoundException('Тренер не найден');
    }

    if (dto.email) {
      await this.prisma.user.update({
        where: { id: trainer.user_id },
        data: { email: dto.email },
      });
    }

    const updated = await this.prisma.trainer.update({
      where: { id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        specialization: dto.specialization,
        description: dto.description,
      },
      include: { user: { select: { email: true } } },
    });

    return {
      id: updated.id,
      fullName: updated.fullName,
      phone: updated.phone,
      email: updated.user.email,
      specialization: updated.specialization,
      description: updated.description,
    };
  }

  async remove(id: number) {
    const trainer = await this.prisma.trainer.findUnique({ where: { id } });
    if (!trainer) {
      throw new NotFoundException('Тренер не найден');
    }

    await this.prisma.user.delete({ where: { id: trainer.user_id } });
    return { message: 'Тренер удален' };
  }
}
