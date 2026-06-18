import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async findAll(query?: { clientId?: number; status?: string }) {
    const where: any = {};

    if (query?.clientId) {
      where.client_id = query.clientId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where,
      include: {
        client: { include: { user: { select: { email: true } } } },
        payments: true,
      },
      orderBy: { startDate: 'desc' },
    });

    return subscriptions.map(s => ({
      id: s.id,
      client: { id: s.client.id, fullName: s.client.fullName, phone: s.client.phone },
      type: s.type,
      status: s.status,
      lessonsLeft: s.lessonsLeft,
      startDate: s.startDate,
      endDate: s.endDate,
      price: s.price,
      payments: s.payments,
    }));
  }

  async findOne(id: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        client: { include: { user: { select: { email: true } } } },
        payments: { orderBy: { paymentDate: 'desc' } },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    return subscription;
  }

  async create(dto: CreateSubscriptionDto) {
    const lessonsLeft = dto.type === 'UNLIMITED' ? 999 :
      dto.type === 'FOUR_LESSONS' ? 4 :
      dto.type === 'EIGHT_LESSONS' ? 8 : 12;

    return this.prisma.subscription.create({
      data: {
        client_id: dto.clientId,
        type: dto.type as any,
        status: 'ACTIVE',
        lessonsLeft,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        price: dto.price,
      },
      include: { client: true },
    });
  }

  async update(id: number, dto: UpdateSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: dto.status as any,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: { client: true },
    });
  }

  async freeze(id: number) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    if (subscription.status !== 'ACTIVE') {
      throw new BadRequestException('Можно заморозить только активный абонемент');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'FROZEN' },
    });
  }

  async unfreeze(id: number) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    if (subscription.status !== 'FROZEN') {
      throw new BadRequestException('Абонемент не заморожен');
    }

    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  async remove(id: number) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    await this.prisma.subscription.delete({ where: { id } });
    return { message: 'Абонемент удален' };
  }

  async useLesson(clientId: number) {
    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        client_id: clientId,
        status: 'ACTIVE',
        lessonsLeft: { gt: 0 },
      },
      orderBy: { startDate: 'asc' },
    });

    if (!activeSubscription) {
      throw new BadRequestException('Нет активного абонемента');
    }

    if (activeSubscription.type !== 'UNLIMITED') {
      const newLessonsLeft = activeSubscription.lessonsLeft - 1;
      await this.prisma.subscription.update({
        where: { id: activeSubscription.id },
        data: {
          lessonsLeft: newLessonsLeft,
          status: newLessonsLeft === 0 ? 'COMPLETED' : 'ACTIVE',
        },
      });
    }

    return { message: 'Занятие списано', lessonsLeft: activeSubscription.lessonsLeft - 1 };
  }

  async requestSubscription(userId: number, type: string, price: number) {
    const client = await this.prisma.client.findUnique({ where: { user_id: userId } });
    if (!client) {
      throw new NotFoundException('Клиент не найден');
    }

    const lessonsLeft = type === 'UNLIMITED' ? 999 :
      type === 'FOUR_LESSONS' ? 4 :
      type === 'EIGHT_LESSONS' ? 8 : 12;

    const subscription = await this.prisma.subscription.create({
      data: {
        client_id: client.id,
        type: type as any,
        status: 'PENDING',
        lessonsLeft,
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        price,
      },
      include: { client: true },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: { name: 'ADMIN' } },
    });
    for (const admin of admins) {
      await this.notifications.create(
        admin.id,
        'Новая заявка на абонемент',
        `${client.fullName} запросил абонемент типа "${type}" на сумму ${price} ₽`,
        'subscription_request',
      );
    }

    return { message: 'Заявка отправлена', subscription };
  }

  async approveSubscription(id: number, startDate: string, endDate: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { client: { include: { user: true } } },
    });
    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    if (subscription.status !== 'PENDING') {
      throw new BadRequestException('Можно одобрить только заявку в статусе ожидания');
    }

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
      include: { client: true },
    });

    await this.notifications.create(
      subscription.client.user_id,
      'Абонемент одобрен',
      `Ваш абонемент "${subscription.type}" активирован. Действует до ${new Date(endDate).toLocaleDateString('ru-RU')}`,
      'subscription_approved',
    );

    return updated;
  }

  async rejectSubscription(id: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { client: { include: { user: true } } },
    });
    if (!subscription) {
      throw new NotFoundException('Абонемент не найден');
    }

    await this.notifications.create(
      subscription.client.user_id,
      'Заявка отклонена',
      `Ваша заявка на абонемент "${subscription.type}" была отклонена`,
      'subscription_rejected',
    );

    await this.prisma.subscription.delete({ where: { id } });
    return { message: 'Заявка отклонена' };
  }
}
