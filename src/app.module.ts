import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './config/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { TrainersModule } from './trainers/trainers.module';
import { GroupsModule } from './groups/groups.module';
import { LessonsModule } from './lessons/lessons.module';
import { AttendanceModule } from './attendance/attendance.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentsModule } from './payments/payments.module';
import { ReportsModule } from './reports/reports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    TrainersModule,
    GroupsModule,
    LessonsModule,
    AttendanceModule,
    SubscriptionsModule,
    PaymentsModule,
    ReportsModule,
    DashboardModule,
    NotificationsModule,
  ],
})
export class AppModule {}
