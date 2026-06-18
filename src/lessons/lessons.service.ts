import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { date?: string; groupId?: number; trainerId?: number }) {
    const where: any = {};

    if (query?.date) {
      const date = new Date(query.date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.lessonDate = { gte: date, lt: nextDay };
    }

    if (query?.groupId) {
      where.group_id = query.groupId;
    }

    if (query?.trainerId) {
      where.trainer_id = query.trainerId;
    }

    const lessons = await this.prisma.lesson.findMany({
      where,
      include: {
        group: true,
        trainer: true,
        attendances: { include: { client: { select: { fullName: true } } } },
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    });

    return lessons;
  }

  async findOne(id: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        group: { include: { groupMembers: { include: { client: { include: { user: { select: { email: true } } } } } } } },
        trainer: true,
        attendances: { include: { client: true } },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Занятие не найдено');
    }

    return lesson;
  }

  async create(dto: CreateLessonDto) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('Время окончания должно быть позже времени начала');
    }

    const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
    if (!group) throw new BadRequestException('Группа не найдена');

    const trainer = await this.prisma.trainer.findUnique({ where: { id: dto.trainerId } });
    if (!trainer) throw new BadRequestException('Тренер не найден');

    const conflict = await this.prisma.lesson.findFirst({
      where: {
        trainer_id: dto.trainerId,
        lessonDate: new Date(dto.lessonDate),
        status: { not: 'CANCELLED' },
        OR: [
          { startTime: { lt: dto.endTime }, endTime: { gt: dto.startTime } },
        ],
      },
    });

    if (conflict) {
      throw new BadRequestException('Тренер уже занят в это время');
    }

    return this.prisma.lesson.create({
      data: {
        group_id: dto.groupId,
        trainer_id: dto.trainerId,
        lessonDate: new Date(dto.lessonDate),
        startTime: dto.startTime,
        endTime: dto.endTime,
        room: dto.room,
      },
      include: { group: true, trainer: true },
    });
  }

  async update(id: number, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Занятие не найдено');
    }

    return this.prisma.lesson.update({
      where: { id },
      data: {
        group_id: dto.groupId,
        trainer_id: dto.trainerId,
        lessonDate: dto.lessonDate ? new Date(dto.lessonDate) : undefined,
        startTime: dto.startTime,
        endTime: dto.endTime,
        room: dto.room,
        status: dto.status as any,
      },
      include: { group: true, trainer: true },
    });
  }

  async remove(id: number) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Занятие не найдено');
    }

    await this.prisma.lesson.delete({ where: { id } });
    return { message: 'Занятие удалено' };
  }

  async getSchedule(query: { startDate?: string; endDate?: string; groupId?: number; trainerId?: number }) {
    const where: any = {};

    if (query.startDate && query.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      where.lessonDate = {
        gte: new Date(query.startDate),
        lte: endDate,
      };
    }

    if (query.groupId) {
      where.group_id = query.groupId;
    }

    if (query.trainerId) {
      where.trainer_id = query.trainerId;
    }

    return this.prisma.lesson.findMany({
      where,
      include: {
        group: {
          include: {
            groupMembers: { include: { client: { select: { id: true, fullName: true } } } },
            trainer: true,
          },
        },
        trainer: { include: { user: { select: { email: true } } } },
        attendances: { include: { client: { select: { id: true } } } },
      },
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  async bookLesson(lessonId: number, userId: number) {
    const client = await this.prisma.client.findUnique({ where: { user_id: userId } });
    if (!client) {
      throw new BadRequestException('Клиент не найден');
    }

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { group: { include: { groupMembers: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Занятие не найдено');
    }

    if (lesson.status !== 'SCHEDULED') {
      throw new BadRequestException('Запись возможна только на запланированные занятия');
    }

    const isMember = lesson.group.groupMembers.some(gm => gm.client_id === client.id);
    if (!isMember) {
      throw new BadRequestException('Вы не являетесь участником этой группы');
    }

    const alreadyBooked = await this.prisma.attendance.findUnique({
      where: { lesson_id_client_id: { lesson_id: lessonId, client_id: client.id } },
    });

    if (alreadyBooked) {
      return { message: 'Вы уже записаны на это занятие' };
    }

    const attendedCount = await this.prisma.attendance.count({
      where: { lesson_id: lessonId },
    });

    if (attendedCount >= lesson.group.maxMembers) {
      throw new BadRequestException('Нет свободных мест');
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        client_id: client.id,
        status: 'ACTIVE',
        lessonsLeft: { gt: 0 },
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException('Нет активного абонемента');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.attendance.create({
        data: {
          lesson_id: lessonId,
          client_id: client.id,
          status: 'BOOKED',
          subscriptionId: activeSubscription.id,
        },
      });

      if (activeSubscription.type !== 'UNLIMITED') {
        const newLessonsLeft = activeSubscription.lessonsLeft - 1;
        await tx.subscription.update({
          where: { id: activeSubscription.id },
          data: {
            lessonsLeft: newLessonsLeft,
            status: newLessonsLeft === 0 ? 'COMPLETED' : 'ACTIVE',
          },
        });
      }

      return { message: 'Вы записаны на занятие' };
    });
  }

  async cancelBooking(lessonId: number, userId: number) {
    const client = await this.prisma.client.findUnique({ where: { user_id: userId } });
    if (!client) {
      throw new BadRequestException('Клиент не найден');
    }

    const attendance = await this.prisma.attendance.findUnique({
      where: { lesson_id_client_id: { lesson_id: lessonId, client_id: client.id } },
      include: { lesson: true },
    });

    if (!attendance) {
      throw new NotFoundException('Запись не найдена');
    }

    if (attendance.lesson.status !== 'SCHEDULED') {
      throw new BadRequestException('Нельзя отменить запись на прошедшее или отмененное занятие');
    }

    return this.prisma.$transaction(async (tx) => {
      if (attendance.subscriptionId) {
        const subscription = await tx.subscription.findUnique({
          where: { id: attendance.subscriptionId },
        });

        if (subscription && subscription.type !== 'UNLIMITED') {
          const newLessonsLeft = subscription.lessonsLeft + 1;
          await tx.subscription.update({
            where: { id: subscription.id },
            data: {
              lessonsLeft: newLessonsLeft,
              status: subscription.status === 'COMPLETED' ? 'ACTIVE' : subscription.status,
            },
          });
        }
      }

      await tx.attendance.delete({
        where: { lesson_id_client_id: { lesson_id: lessonId, client_id: client.id } },
      });

      return { message: 'Запись отменена' };
    });
  }
}
