import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const roles = await Promise.all([
    prisma.userRole.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } }),
    prisma.userRole.upsert({ where: { name: 'TRAINER' }, update: {}, create: { name: 'TRAINER' } }),
    prisma.userRole.upsert({ where: { name: 'CLIENT' }, update: {}, create: { name: 'CLIENT' } }),
  ]);

  const adminRole = roles.find(r => r.name === 'ADMIN');
  const trainerRole = roles.find(r => r.name === 'TRAINER');
  const clientRole = roles.find(r => r.name === 'CLIENT');

  const passwordHash = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@studio.ru' },
    update: {},
    create: {
      email: 'admin@studio.ru',
      passwordHash,
      role_id: adminRole.id,
    },
  });

  const trainerUsers = await Promise.all([
    prisma.user.upsert({
      where: { email: 'ivanov@studio.ru' },
      update: {},
      create: { email: 'ivanov@studio.ru', passwordHash, role_id: trainerRole.id },
    }),
    prisma.user.upsert({
      where: { email: 'petrova@studio.ru' },
      update: {},
      create: { email: 'petrova@studio.ru', passwordHash, role_id: trainerRole.id },
    }),
    prisma.user.upsert({
      where: { email: 'smirnova@studio.ru' },
      update: {},
      create: { email: 'smirnova@studio.ru', passwordHash, role_id: trainerRole.id },
    }),
  ]);

  const trainers = await Promise.all([
    prisma.trainer.upsert({
      where: { user_id: trainerUsers[0].id },
      update: {},
      create: {
        user_id: trainerUsers[0].id,
        fullName: 'Иванов И.И.',
        phone: '+7 (999) 111-11-11',
        specialization: 'Hip-Hop',
        description: 'Опытный преподаватель хип-хопа',
      },
    }),
    prisma.trainer.upsert({
      where: { user_id: trainerUsers[1].id },
      update: {},
      create: {
        user_id: trainerUsers[1].id,
        fullName: 'Петрова П.П.',
        phone: '+7 (999) 222-22-22',
        specialization: 'Contemporary',
        description: 'Преподаватель современного танца',
      },
    }),
    prisma.trainer.upsert({
      where: { user_id: trainerUsers[2].id },
      update: {},
      create: {
        user_id: trainerUsers[2].id,
        fullName: 'Смирнова А.А.',
        phone: '+7 (999) 333-33-33',
        specialization: 'Stretching',
        description: 'Преподаватель растяжки',
      },
    }),
  ]);

  const groups = [];
  for (const g of [
    { name: 'Группа 1', danceStyle: 'Hip-Hop', trainer_id: trainers[0].id, maxMembers: 15 },
    { name: 'Группа 2', danceStyle: 'Contemporary', trainer_id: trainers[1].id, maxMembers: 12 },
    { name: 'Группа 3', danceStyle: 'Stretching', trainer_id: trainers[2].id, maxMembers: 20 },
  ]) {
    const existing = await prisma.group.findFirst({ where: { name: g.name, danceStyle: g.danceStyle } });
    if (existing) {
      groups.push(existing);
    } else {
      groups.push(await prisma.group.create({ data: g }));
    }
  }

  const clientData = [
    { email: 'alexandrova@studio.ru', fullName: 'Александрова Анна', phone: '+7 (999) 444-44-44', gender: 'FEMALE' as const },
    { email: 'volkova@studio.ru', fullName: 'Волкова Мария', phone: '+7 (999) 555-55-55', gender: 'FEMALE' as const },
    { email: 'gromov@studio.ru', fullName: 'Громов Дмитрий', phone: '+7 (999) 666-66-66', gender: 'MALE' as const },
    { email: 'egorova@studio.ru', fullName: 'Егорова София', phone: '+7 (999) 777-77-77', gender: 'FEMALE' as const },
    { email: 'zhukov@studio.ru', fullName: 'Жуков Максим', phone: '+7 (999) 888-88-88', gender: 'MALE' as const },
    { email: 'zaytseva@studio.ru', fullName: 'Зайцева Полина', phone: '+7 (999) 999-99-99', gender: 'FEMALE' as const },
    { email: 'ivanova@studio.ru', fullName: 'Иванова Дарья', phone: '+7 (999) 000-00-00', gender: 'FEMALE' as const },
    { email: 'kuznetsov@studio.ru', fullName: 'Кузнецов Артем', phone: '+7 (999) 101-10-10', gender: 'MALE' as const },
    { email: 'lebedeva@studio.ru', fullName: 'Лебедева Екатерина', phone: '+7 (999) 202-20-20', gender: 'FEMALE' as const },
    { email: 'morozova@studio.ru', fullName: 'Морозова Алиса', phone: '+7 (999) 303-30-30', gender: 'FEMALE' as const },
  ];

  const clients = [];
  for (const cd of clientData) {
    const user = await prisma.user.upsert({
      where: { email: cd.email },
      update: {},
      create: { email: cd.email, passwordHash, role_id: clientRole.id },
    });
    const client = await prisma.client.upsert({
      where: { user_id: user.id },
      update: {},
      create: {
        user_id: user.id,
        fullName: cd.fullName,
        phone: cd.phone,
        gender: cd.gender,
        birthDate: new Date('2000-01-01'),
      },
    });
    clients.push(client);
  }

  for (let i = 0; i < clients.length; i++) {
    const groupIndex = i % groups.length;
    const existing = await prisma.groupMember.findUnique({
      where: { group_id_client_id: { group_id: groups[groupIndex].id, client_id: clients[i].id } },
    });
    if (!existing) {
      await prisma.groupMember.create({
        data: { group_id: groups[groupIndex].id, client_id: clients[i].id },
      });
    }
  }

  const today = new Date();
  const lessons = [];
  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    const existing = await prisma.lesson.findMany({
      where: { lessonDate: new Date(dateStr) },
    });
    if (existing.length > 0) {
      lessons.push(...existing);
      continue;
    }

    lessons.push(
      await prisma.lesson.create({
        data: {
          group_id: groups[0].id,
          trainer_id: trainers[0].id,
          lessonDate: date,
          startTime: '10:00',
          endTime: '11:00',
          room: 'Зал 1',
          status: 'SCHEDULED',
        },
      }),
      await prisma.lesson.create({
        data: {
          group_id: groups[1].id,
          trainer_id: trainers[1].id,
          lessonDate: date,
          startTime: '11:30',
          endTime: '12:30',
          room: 'Зал 2',
          status: 'SCHEDULED',
        },
      }),
      await prisma.lesson.create({
        data: {
          group_id: groups[2].id,
          trainer_id: trainers[2].id,
          lessonDate: date,
          startTime: '13:00',
          endTime: '14:00',
          room: 'Зал 1',
          status: 'SCHEDULED',
        },
      }),
    );
  }

  for (const client of clients.slice(0, 5)) {
    const existingSub = await prisma.subscription.findFirst({ where: { client_id: client.id, type: 'UNLIMITED' } });
    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          client_id: client.id,
          type: 'UNLIMITED',
          status: 'ACTIVE',
          lessonsLeft: 999,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-12-31'),
          price: 15900,
        },
      });
    }
  }

  for (const client of clients.slice(5, 10)) {
    const existingSub = await prisma.subscription.findFirst({ where: { client_id: client.id, type: 'TWELVE_LESSONS' } });
    if (!existingSub) {
      await prisma.subscription.create({
        data: {
          client_id: client.id,
          type: 'TWELVE_LESSONS',
          status: 'ACTIVE',
          lessonsLeft: 8,
          startDate: new Date('2025-05-01'),
          endDate: new Date('2025-06-30'),
          price: 9200,
        },
      });
    }
  }

  for (const client of clients.slice(0, 3)) {
    const existingPayment = await prisma.payment.findFirst({ where: { client_id: client.id } });
    if (!existingPayment) {
      const sub = await prisma.subscription.findFirst({ where: { client_id: client.id } });
      await prisma.payment.create({
        data: {
          client_id: client.id,
          amount: 15900,
          paymentMethod: 'Карта',
          comment: 'Оплата абонемента',
          subscription_id: sub?.id,
        },
      });
    }
  }

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
