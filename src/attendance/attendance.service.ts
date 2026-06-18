import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { MarkAttendanceDto, CreateAttendanceDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async findByLesson(lessonId: number) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        group: { include: { groupMembers: { include: { client: { include: { user: { select: { email: true } } } } } } } },
        trainer: true,
        attendances: { include: { client: { select: { fullName: true } } } },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Занятие не найдено');
    }

    const members = lesson.group.groupMembers.map(gm => gm.client);
    const attendanceMap = new Map(lesson.attendances.map(a => [a.client_id, a]));

    const items = members.map((member, index) => {
      const attendance = attendanceMap.get(member.id);
      return {
        number: index + 1,
        clientId: member.id,
        fullName: member.fullName,
        status: attendance?.status || null,
        comment: attendance?.comment || null,
      };
    });

    return {
      lesson: {
        id: lesson.id,
        date: lesson.lessonDate,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        room: lesson.room,
        group: lesson.group.name,
        trainer: lesson.trainer.fullName,
      },
      totalMembers: members.length,
      present: items.filter(i => i.status === 'PRESENT').length,
      absent: items.filter(i => i.status === 'ABSENT').length,
      items,
    };
  }

  async mark(lessonId: number, dto: MarkAttendanceDto) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { group: { include: { groupMembers: true } } },
    });

    if (!lesson) {
      throw new NotFoundException('Занятие не найдено');
    }

    if (lesson.status === 'CANCELLED') {
      throw new BadRequestException('Нельзя отмечать посещаемость отмененного занятия');
    }

    const groupMemberIds = lesson.group.groupMembers.map(gm => gm.client_id);

    const validItems = dto.items.filter(item => groupMemberIds.includes(item.clientId));

    await this.prisma.$transaction(
      validItems.map(item =>
        this.prisma.attendance.upsert({
          where: { lesson_id_client_id: { lesson_id: lessonId, client_id: item.clientId } },
          update: { status: item.status as any, comment: item.comment },
          create: { lesson_id: lessonId, client_id: item.clientId, status: item.status as any, comment: item.comment },
        })
      )
    );

    return { message: 'Посещаемость отмечена' };
  }

  async findAll(query?: { clientId?: number; startDate?: string; endDate?: string }) {
    const where: any = {};

    if (query?.clientId) {
      where.client_id = query.clientId;
    }

    if (query?.startDate && query?.endDate) {
      where.lesson = {
        lessonDate: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
      };
    }

    return this.prisma.attendance.findMany({
      where,
      include: {
        lesson: { include: { group: true, trainer: true } },
        client: { select: { fullName: true } },
      },
      orderBy: { lesson: { lessonDate: 'desc' } },
    });
  }

  async getStats(query?: { groupId?: number; startDate?: string; endDate?: string }) {
    const where: any = {};

    if (query?.groupId) {
      where.lesson = { group_id: query.groupId };
    }

    if (query?.startDate && query?.endDate) {
      if (where.lesson) {
        where.lesson.lessonDate = {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        };
      } else {
        where.lesson = {
          lessonDate: {
            gte: new Date(query.startDate),
            lte: new Date(query.endDate),
          },
        };
      }
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      include: { lesson: { include: { group: true } } },
    });

    const total = attendances.length;
    const present = attendances.filter(a => a.status === 'PRESENT').length;

    return {
      total,
      present,
      absent: total - present,
      percentage: total > 0 ? Math.round((present / total) * 100) : 0,
    };
  }
}
