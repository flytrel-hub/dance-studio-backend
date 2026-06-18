import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: { clientId?: number; startDate?: string; endDate?: string }) {
    const where: any = {};

    if (query?.clientId) {
      where.client_id = query.clientId;
    }

    if (query?.startDate && query?.endDate) {
      where.paymentDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const payments = await this.prisma.payment.findMany({
      where,
      include: {
        client: { include: { user: { select: { email: true } } } },
        subscription: true,
      },
      orderBy: { paymentDate: 'desc' },
    });

    return payments.map(p => ({
      id: p.id,
      client: { id: p.client.id, fullName: p.client.fullName, phone: p.client.phone },
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      comment: p.comment,
      subscription: p.subscription,
    }));
  }

  async findOne(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        client: { include: { user: { select: { email: true } } } },
        subscription: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Платеж не найден');
    }

    return payment;
  }

  async create(dto: CreatePaymentDto) {
    const payment = await this.prisma.payment.create({
      data: {
        client_id: dto.clientId,
        amount: dto.amount,
        paymentMethod: dto.paymentMethod,
        comment: dto.comment,
        subscription_id: dto.subscriptionId,
      },
      include: { client: true, subscription: true },
    });

    return payment;
  }

  async getStats(query?: { startDate?: string; endDate?: string }) {
    const where: any = {};

    if (query?.startDate && query?.endDate) {
      where.paymentDate = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const payments = await this.prisma.payment.findMany({ where });
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPayments: payments.length,
      totalAmount,
      averageAmount: payments.length > 0 ? Math.round(totalAmount / payments.length) : 0,
    };
  }

  async getRecentPayments(limit: number = 5) {
    const payments = await this.prisma.payment.findMany({
      take: limit,
      include: {
        client: { select: { fullName: true } },
        subscription: { select: { type: true } },
      },
      orderBy: { paymentDate: 'desc' },
    });

    return payments;
  }

  async remove(id: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Платеж не найден');
    }

    await this.prisma.payment.delete({ where: { id } });
    return { message: 'Платеж удален' };
  }
}
