import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Cleanup duplicate lessons
  const allLessons = await prisma.lesson.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, group_id: true, trainer_id: true, lessonDate: true, startTime: true },
  });

  const seen = new Set<string>();
  const duplicates: number[] = [];
  for (const lesson of allLessons) {
    const key = `${lesson.group_id}-${lesson.trainer_id}-${lesson.lessonDate.toISOString().split('T')[0]}-${lesson.startTime}`;
    if (seen.has(key)) {
      duplicates.push(lesson.id);
    } else {
      seen.add(key);
    }
  }

  if (duplicates.length > 0) {
    await prisma.attendance.deleteMany({ where: { lesson_id: { in: duplicates } } });
    await prisma.lesson.deleteMany({ where: { id: { in: duplicates } } });
    console.log(`Removed ${duplicates.length} duplicate lessons`);
  }

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

  await prisma.client.upsert({
    where: { user_id: adminUser.id },
    update: {},
    create: {
      user_id: adminUser.id,
      fullName: 'Администратор',
      phone: '+7 (999) 000-00-00',
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
  today.setHours(0, 0, 0, 0);

  const lessonsToCreate = [
    { groupIdx: 0, trainerIdx: 0, startTime: '10:00', endTime: '11:00', room: 'Зал 1' },
    { groupIdx: 1, trainerIdx: 1, startTime: '11:30', endTime: '12:30', room: 'Зал 2' },
    { groupIdx: 2, trainerIdx: 2, startTime: '13:00', endTime: '14:00', room: 'Зал 1' },
  ];

  const lessons = [];
  for (let day = 0; day < 7; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() + day);

    for (const lt of lessonsToCreate) {
      const existing = await prisma.lesson.findFirst({
        where: {
          group_id: groups[lt.groupIdx].id,
          trainer_id: trainers[lt.trainerIdx].id,
          lessonDate: date,
          startTime: lt.startTime,
        },
      });
      if (existing) {
        lessons.push(existing);
      } else {
        lessons.push(
          await prisma.lesson.create({
            data: {
              group_id: groups[lt.groupIdx].id,
              trainer_id: trainers[lt.trainerIdx].id,
              lessonDate: date,
              startTime: lt.startTime,
              endTime: lt.endTime,
              room: lt.room,
              status: 'SCHEDULED',
            },
          }),
        );
      }
    }
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
