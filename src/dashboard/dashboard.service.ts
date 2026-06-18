import { Injectable } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const [
      totalClients,
      activeGroups,
      todayLessons,
      monthPayments,
      lastMonthPayments,
      lastWeekClients,
    ] = await Promise.all([
      this.prisma.client.count(),
      this.prisma.group.count(),
      this.prisma.lesson.count({
        where: {
          lessonDate: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
      }),
      this.prisma.payment.aggregate({
        where: { paymentDate: { gte: thisMonth } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.payment.aggregate({
        where: { paymentDate: { gte: lastMonth, lte: lastMonthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.client.count({
        where: {
          registeredAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const recentPayments = await this.prisma.payment.findMany({
      take: 5,
      include: {
        client: { select: { fullName: true } },
        subscription: { select: { type: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    const todayLessonsList = await this.prisma.lesson.findMany({
      where: {
        lessonDate: { gte: today, lt: tomorrow },
        status: { not: 'CANCELLED' },
      },
      include: { group: true, trainer: true },
      orderBy: { startTime: 'asc' },
    });

    return {
      totalClients,
      clientsChange: lastWeekClients,
      activeGroups,
      todayLessons,
      monthPayments: monthPayments._sum.amount || 0,
      paymentsChange: lastMonthPayments._sum.amount
        ? Math.round((((monthPayments._sum.amount || 0) - (lastMonthPayments._sum.amount || 0)) / (lastMonthPayments._sum.amount || 1)) * 100)
        : 0,
      recentPayments,
      todayLessonsList,
    };
  }
}
