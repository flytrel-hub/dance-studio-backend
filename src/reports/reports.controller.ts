import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обзорная статистика' })
  getOverview() {
    return this.reportsService.getOverview();
  }

  @Get('attendance/groups')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Посещаемость по группам' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAttendanceByGroups(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getAttendanceByGroups({ startDate, endDate });
  }

  @Get('attendance/trainers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Посещаемость по тренерам' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getAttendanceByTrainers(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getAttendanceByTrainers({ startDate, endDate });
  }

  @Get('revenue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Доход за период' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getRevenue(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getRevenueByPeriod({ startDate, endDate });
  }

  @Get('subscriptions/distribution')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Распределение абонементов' })
  getSubscriptionDistribution() {
    return this.reportsService.getSubscriptionDistribution();
  }
}
