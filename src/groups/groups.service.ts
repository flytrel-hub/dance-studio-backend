import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../config/prisma.service';
import { CreateGroupDto, UpdateGroupDto, AddMembersDto } from './dto/group.dto';

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll(trainerId?: number) {
    const where: any = {};
    if (trainerId) {
      where.trainer_id = trainerId;
    }

    const groups = await this.prisma.group.findMany({
      where,
      include: {
        trainer: { include: { user: { select: { email: true } } } },
        groupMembers: { include: { client: { select: { fullName: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    return groups.map(g => ({
      id: g.id,
      name: g.name,
      danceStyle: g.danceStyle,
      trainer: { id: g.trainer.id, fullName: g.trainer.fullName, specialization: g.trainer.specialization },
      maxMembers: g.maxMembers,
      membersCount: g.groupMembers.length,
      members: g.groupMembers.map(gm => gm.client),
    }));
  }

  async findOne(id: number) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        trainer: { include: { user: { select: { email: true } } } },
        groupMembers: { include: { client: { include: { user: { select: { email: true } } } } } },
        lessons: { orderBy: { lessonDate: 'desc' }, take: 10 },
      },
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    return {
      id: group.id,
      name: group.name,
      danceStyle: group.danceStyle,
      trainer: { id: group.trainer.id, fullName: group.trainer.fullName, specialization: group.trainer.specialization },
      maxMembers: group.maxMembers,
      members: group.groupMembers.map(gm => ({
        id: gm.client.id,
        fullName: gm.client.fullName,
        phone: gm.client.phone,
        email: gm.client.user.email,
      })),
      lessons: group.lessons,
    };
  }

  async create(dto: CreateGroupDto) {
    if (dto.clientIds && dto.clientIds.length > dto.maxMembers) {
      throw new BadRequestException(`Количество участников (${dto.clientIds.length}) превышает максимальное (${dto.maxMembers})`);
    }

    const trainer = await this.prisma.trainer.findUnique({ where: { id: dto.trainerId } });
    if (!trainer) throw new BadRequestException('Тренер не найден');

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        danceStyle: dto.danceStyle,
        trainer_id: dto.trainerId,
        maxMembers: dto.maxMembers,
        groupMembers: dto.clientIds ? {
          create: dto.clientIds.map(id => ({ client_id: id })),
        } : undefined,
      },
      include: { trainer: true },
    });

    return group;
  }

  async update(id: number, dto: UpdateGroupDto) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    return this.prisma.group.update({
      where: { id },
      data: {
        name: dto.name,
        danceStyle: dto.danceStyle,
        trainer_id: dto.trainerId,
        maxMembers: dto.maxMembers,
      },
      include: { trainer: true },
    });
  }

  async remove(id: number) {
    const group = await this.prisma.group.findUnique({ where: { id } });
    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    await this.prisma.group.delete({ where: { id } });
    return { message: 'Группа удалена' };
  }

  async addMembers(id: number, dto: AddMembersDto, user: { id: number; role: string }) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: { groupMembers: true, trainer: { include: { user: true } } },
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    if (user.role === 'TRAINER' && group.trainer.user_id !== user.id) {
      throw new ForbiddenException('Вы не являетесь тренером этой группы');
    }

    const existingIds = group.groupMembers.map(gm => gm.client_id);
    const newIds = dto.clientIds.filter(cid => !existingIds.includes(cid));

    if (existingIds.length + newIds.length > group.maxMembers) {
      throw new BadRequestException(`Превышен лимит участников группы (${group.maxMembers}). Текущее количество: ${existingIds.length}, добавляется: ${newIds.length}`);
    }

    await this.prisma.groupMember.createMany({
      data: newIds.map(clientId => ({ group_id: id, client_id: clientId })),
    });

    return { message: 'Участники добавлены' };
  }

  async removeMember(groupId: number, clientId: number, user: { id: number; role: string }) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: { trainer: { include: { user: true } } },
    });

    if (!group) {
      throw new NotFoundException('Группа не найдена');
    }

    if (user.role === 'TRAINER' && group.trainer.user_id !== user.id) {
      throw new ForbiddenException('Вы не являетесь тренером этой группы');
    }

    await this.prisma.groupMember.deleteMany({
      where: { group_id: groupId, client_id: clientId },
    });
    return { message: 'Участник удален из группы' };
  }
}
