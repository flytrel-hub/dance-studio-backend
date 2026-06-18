import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('lesson/:lessonId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Посещаемость по занятию' })
  findByLesson(@Param('lessonId') lessonId: string) {
    return this.attendanceService.findByLesson(+lessonId);
  }

  @Post('lesson/:lessonId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TRAINER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Отметить посещаемость' })
  mark(@Param('lessonId') lessonId: string, @Body() dto: MarkAttendanceDto) {
    return this.attendanceService.mark(+lessonId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'История посещений' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  findAll(
    @Query('clientId') clientId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.findAll({ clientId, startDate, endDate });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Статистика посещаемости' })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getStats(
    @Query('groupId') groupId?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.attendanceService.getStats({ groupId, startDate, endDate });
  }
}
