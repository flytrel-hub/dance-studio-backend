import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { CreateLessonDto, UpdateLessonDto } from './dto/lesson.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Lessons')
@Controller('lessons')
export class LessonsController {
  constructor(private lessonsService: LessonsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список занятий' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'trainerId', required: false })
  findAll(
    @Query('date') date?: string,
    @Query('groupId') groupId?: number,
    @Query('trainerId') trainerId?: number,
  ) {
    return this.lessonsService.findAll({ date, groupId, trainerId });
  }

  @Get('schedule')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Расписание' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'trainerId', required: false })
  getSchedule(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('groupId') groupId?: number,
    @Query('trainerId') trainerId?: number,
  ) {
    return this.lessonsService.getSchedule({ startDate, endDate, groupId, trainerId });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить занятие по ID' })
  findOne(@Param('id') id: string) {
    return this.lessonsService.findOne(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать занятие' })
  create(@Body() dto: CreateLessonDto) {
    return this.lessonsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить занятие' })
  update(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить занятие' })
  remove(@Param('id') id: string) {
    return this.lessonsService.remove(+id);
  }

  @Post(':id/book')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Записаться на занятие' })
  bookLesson(@Param('id') id: string, @Req() req: any) {
    return this.lessonsService.bookLesson(+id, req.user.id);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Отменить запись на занятие' })
  cancelBooking(@Param('id') id: string, @Req() req: any) {
    return this.lessonsService.cancelBooking(+id, req.user.id);
  }
}
