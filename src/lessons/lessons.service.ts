import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LessonsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

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

    const date = new Date(dto.lessonDate);
    const timeOverlap = { startTime: { lt: dto.endTime }, endTime: { gt: dto.startTime } };

    const trainerConflict = await this.prisma.lesson.findFirst({
      where: {
        trainer_id: dto.trainerId,
        lessonDate: date,
        status: { not: 'CANCELLED' },
        ...timeOverlap,
      },
    });
    if (trainerConflict) {
      throw new BadRequestException('Тренер уже занят в это время');
    }

    const roomConflict = await this.prisma.lesson.findFirst({
      where: {
        room: dto.room,
        lessonDate: date,
        status: { not: 'CANCELLED' },
        ...timeOverlap,
      },
    });
    if (roomConflict) {
      throw new BadRequestException(`Зал "${dto.room}" уже занят в это время`);
    }

    const groupConflict = await this.prisma.lesson.findFirst({
      where: {
        group_id: dto.groupId,
        lessonDate: date,
        status: { not: 'CANCELLED' },
        ...timeOverlap,
      },
    });
    if (groupConflict) {
      throw new BadRequestException(`Группа "${group.name}" уже занята в это время`);
    }

    return this.prisma.lesson.create({
      data: {
        group_id: dto.groupId,
        trainer_id: dto.trainerId,
        lessonDate: date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        room: dto.room,
        bookingType: (dto.bookingType as any) || 'OPEN',
      },
      include: { group: true, trainer: true },
    });
  }

  async update(id: number, dto: UpdateLessonDto) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Занятие не найдено');
    }

    const finalDate = dto.lessonDate ? new Date(dto.lessonDate) : lesson.lessonDate;
    const finalStart = dto.startTime || lesson.startTime;
    const finalEnd = dto.endTime || lesson.endTime;
    const finalTrainerId = dto.trainerId || lesson.trainer_id;
    const finalRoom = dto.room || lesson.room;
    const finalGroupId = dto.groupId || lesson.group_id;

    if (finalStart >= finalEnd) {
      throw new BadRequestException('Время окончания должно быть позже времени начала');
    }

    if (dto.status && dto.status !== 'CANCELLED') {
      const timeOverlap = { startTime: { lt: finalEnd }, endTime: { gt: finalStart } };

      const trainerConflict = await this.prisma.lesson.findFirst({
        where: {
          trainer_id: finalTrainerId,
          lessonDate: finalDate,
          status: { not: 'CANCELLED' },
          id: { not: id },
          ...timeOverlap,
        },
      });
      if (trainerConflict) {
        throw new BadRequestException('Тренер уже занят в это время');
      }

      const roomConflict = await this.prisma.lesson.findFirst({
        where: {
          room: finalRoom,
          lessonDate: finalDate,
          status: { not: 'CANCELLED' },
          id: { not: id },
          ...timeOverlap,
        },
      });
      if (roomConflict) {
        throw new BadRequestException(`Зал "${finalRoom}" уже занят в это время`);
      }

      const groupConflict = await this.prisma.lesson.findFirst({
        where: {
          group_id: finalGroupId,
          lessonDate: finalDate,
          status: { not: 'CANCELLED' },
          id: { not: id },
          ...timeOverlap,
        },
      });
      if (groupConflict) {
        const group = await this.prisma.group.findUnique({ where: { id: finalGroupId } });
        throw new BadRequestException(`Группа "${group?.name || ''}" уже занята в это время`);
      }
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
      include: { group: true },
    });

    if (!lesson) {
      throw new NotFoundException('Занятие не найдено');
    }

    if (lesson.status !== 'SCHEDULED') {
      throw new BadRequestException('Запись возможна только на запланированные занятия');
    }

    const alreadyBooked = await this.prisma.attendance.findUnique({
      where: { lesson_id_client_id: { lesson_id: lessonId, client_id: client.id } },
    });

    if (alreadyBooked) {
      return { message: 'Вы уже записаны на это занятие' };
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

    const isApplication = lesson.bookingType === 'APPLICATION';

    if (!isApplication) {
      const attendedCount = await this.prisma.attendance.count({
        where: { lesson_id: lessonId },
      });
      if (attendedCount >= lesson.group.maxMembers) {
        throw new BadRequestException('Нет свободных мест');
      }
    }

    const status = isApplication ? 'PENDING' : 'BOOKED';

    await this.prisma.attendance.create({
      data: {
        lesson_id: lessonId,
        client_id: client.id,
        status: status as any,
        subscriptionId: activeSubscription.id,
      },
    });

    if (!isApplication && activeSubscription.type !== 'UNLIMITED') {
      await this.prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          lessonsLeft: activeSubscription.lessonsLeft - 1,
          status: activeSubscription.lessonsLeft - 1 === 0 ? 'COMPLETED' : 'ACTIVE',
        },
      });
    }

    const lessonFull = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { group: true, trainer: { include: { user: true } } },
    });
    if (lessonFull) {
      await this.notifications.create(
        lessonFull.trainer.user.id,
        isApplication ? 'Новая заявка на занятие' : 'Новая запись на занятие',
        `${client.fullName} ${isApplication ? 'подал заявку на' : 'записался на'} занятие "${lessonFull.group.name}" ${lessonFull.lessonDate.toLocaleDateString('ru-RU')} в ${lessonFull.startTime}`,
        isApplication ? 'booking_application' : 'booking',
      );
    }

    return { message: isApplication ? 'Заявка отправлена. Ожидайте одобрения тренера.' : 'Вы записаны на занятие' };
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

    const lessonFull = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { group: true, trainer: { include: { user: true } } },
    });

    await this.prisma.$transaction(async (tx) => {
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
    });

    if (lessonFull) {
      await this.notifications.create(
        lessonFull.trainer.user.id,
        'Отмена записи на занятие',
        `${client.fullName} отменил запись на занятие "${lessonFull.group.name}" ${lessonFull.lessonDate.toLocaleDateString('ru-RU')} в ${lessonFull.startTime}`,
        'booking_cancelled',
      );
    }

    return { message: 'Запись отменена' };
  }

  async approveBooking(lessonId: number, clientId: number, trainerUserId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { trainer: true, group: true },
    });
    if (!lesson) throw new NotFoundException('Занятие не найдено');
    if (lesson.trainer.user_id !== trainerUserId) throw new BadRequestException('Нет доступа');

    const attendance = await this.prisma.attendance.findUnique({
      where: { lesson_id_client_id: { lesson_id: lessonId, client_id: clientId } },
      include: { client: true },
    });
    if (!attendance) throw new NotFoundException('Запись не найдена');
    if (attendance.status !== 'PENDING') throw new BadRequestException('Запись не в статусе ожидания');

    const attendedCount = await this.prisma.attendance.count({
      where: { lesson_id: lessonId, status: { not: 'PENDING' } },
    });
    if (attendedCount >= lesson.group.maxMembers) {
      throw new BadRequestException('Нет свободных мест');
    }

    await this.prisma.attendance.update({
      where: { lesson_id_client_id: { lesson_id: lessonId, client_id: clientId } },
      data: { status: 'BOOKED' },
    });

    if (attendance.subscriptionId) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: attendance.subscriptionId },
      });
      if (subscription && subscription.type !== 'UNLIMITED') {
        const newLessonsLeft = subscription.lessonsLeft - 1;
        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            lessonsLeft: newLessonsLeft,
            status: newLessonsLeft === 0 ? 'COMPLETED' : 'ACTIVE',
          },
        });
      }
    }

    await this.notifications.create(
      attendance.client.user_id,
      'Заявка одобрена',
      `Ваша заявка на занятие "${lesson.group.name}" ${lesson.lessonDate.toLocaleDateString('ru-RU')} в ${lesson.startTime} одобрена`,
      'booking_approved',
    );

    return { message: 'Заявка одобрена' };
  }

  async rejectBooking(lessonId: number, clientId: number, trainerUserId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { trainer: true, group: true },
    });
    if (!lesson) throw new NotFoundException('Занятие не найдено');
    if (lesson.trainer.user_id !== trainerUserId) throw new BadRequestException('Нет доступа');

    const attendance = await this.prisma.attendance.findUnique({
      where: { lesson_id_client_id: { lesson_id: lessonId, client_id: clientId } },
      include: { client: true },
    });
    if (!attendance) throw new NotFoundException('Запись не найдена');

    await this.prisma.attendance.delete({
      where: { lesson_id_client_id: { lesson_id: lessonId, client_id: clientId } },
    });

    await this.notifications.create(
      attendance.client.user_id,
      'Заявка отклонена',
      `Ваша заявка на занятие "${lesson.group.name}" ${lesson.lessonDate.toLocaleDateString('ru-RU')} в ${lesson.startTime} отклонена`,
      'booking_rejected',
    );

    return { message: 'Заявка отклонена' };
  }

  async getPendingBookings(trainerUserId: number) {
    const trainer = await this.prisma.trainer.findUnique({ where: { user_id: trainerUserId } });
    if (!trainer) throw new NotFoundException('Тренер не найден');

    return this.prisma.attendance.findMany({
      where: {
        status: 'PENDING',
        lesson: { trainer_id: trainer.id },
      },
      include: {
        client: { select: { id: true, fullName: true, phone: true } },
        lesson: { include: { group: { select: { name: true, danceStyle: true } } } },
      },
      orderBy: { lesson: { lessonDate: 'asc' } },
    });
  }
}
