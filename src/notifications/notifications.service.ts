import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../config/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    await this.cleanup();
  }

  async create(userId: number, title: string, message: string, type: string) {
    return this.prisma.notification.create({
      data: { user_id: userId, title, message, type },
    });
  }

  async findAll(userId: number) {
    return this.prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: number) {
    return this.prisma.notification.count({
      where: { user_id: userId, isRead: false },
    });
  }

  async markAsRead(id: number, userId: number) {
    return this.prisma.notification.updateMany({
      where: { id, user_id: userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { user_id: userId, isRead: false },
      data: { isRead: true },
    });
  }

  async cleanup() {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    return this.prisma.notification.deleteMany({
      where: { createdAt: { lt: threeDaysAgo } },
    });
  }
}
