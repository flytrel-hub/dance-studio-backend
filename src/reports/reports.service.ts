import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const [totalClients, activeSubscriptions, totalLessons, totalPayments] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      this.prisma.lesson.count({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.payment.aggregate({ _sum: { amount: true } }),
    ]);

    return {
      totalClients,
      activeSubscriptions,
      totalLessons,
      totalRevenue: totalPayments._sum.amount || 0,
    };
  }

  async getAttendanceByGroups(query?: { startDate?: string; endDate?: string }) {
    const where: any = {};

    if (query?.startDate && query?.endDate) {
      where.lesson = {
        lessonDate: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
      };
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      include: { lesson: { include: { group: true } } },
    });

    const groupStats = new Map<number, { name: string; total: number; present: number }>();

    for (const att of attendances) {
      const groupId = att.lesson.group.id;
      const existing = groupStats.get(groupId) || { name: att.lesson.group.name, total: 0, present: 0 };
      existing.total++;
      if (att.status === 'PRESENT') existing.present++;
      groupStats.set(groupId, existing);
    }

    return Array.from(groupStats.values()).map(s => ({
      ...s,
      percentage: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
    }));
  }

  async getAttendanceByTrainers(query?: { startDate?: string; endDate?: string }) {
    const where: any = {};

    if (query?.startDate && query?.endDate) {
      where.lesson = {
        lessonDate: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
      };
    }

    const lessons = await this.prisma.lesson.findMany({
      where,
      include: {
        trainer: true,
        attendances: true,
      },
    });

    const trainerStats = new Map<number, { name: string; totalLessons: number; totalAttended: number }>();

    for (const lesson of lessons) {
      const trainerId = lesson.trainer.id;
      const existing = trainerStats.get(trainerId) || { name: lesson.trainer.fullName, totalLessons: 0, totalAttended: 0 };
      existing.totalLessons++;
      existing.totalAttended += lesson.attendances.filter(a => a.status === 'PRESENT').length;
      trainerStats.set(trainerId, existing);
    }

    return Array.from(trainerStats.values()).map(s => ({
      ...s,
      averageAttendance: s.totalLessons > 0 ? Math.round(s.totalAttended / s.totalLessons) : 0,
    }));
  }

  async getRevenueByPeriod(query?: { startDate?: string; endDate?: string }) {
    const where: any = {};

    if (query?.startDate && query?.endDate) {
      where.paymentDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const payments = await this.prisma.payment.findMany({ where });

    const monthlyStats = new Map<string, { month: string; total: number; count: number }>();

    for (const payment of payments) {
      const month = payment.paymentDate.toISOString().substring(0, 7);
      const existing = monthlyStats.get(month) || { month, total: 0, count: 0 };
      existing.total += payment.amount;
      existing.count++;
      monthlyStats.set(month, existing);
    }

    return Array.from(monthlyStats.values());
  }

  async getSubscriptionDistribution() {
    const subscriptions = await this.prisma.subscription.groupBy({
      by: ['type'],
      _count: { id: true },
    });

    const typeLabels: Record<string, string> = {
      FOUR_LESSONS: '4 занятия',
      EIGHT_LESSONS: '8 занятий',
      TWELVE_LESSONS: '12 занятий',
      UNLIMITED: 'Безлимитный',
    };

    return subscriptions.map(s => ({
      name: typeLabels[s.type] || s.type,
      value: s._count.id,
    }));
  }
}
