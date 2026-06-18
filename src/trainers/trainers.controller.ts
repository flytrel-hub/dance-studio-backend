import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TrainersService } from './trainers.service';
import { CreateTrainerDto, UpdateTrainerDto } from './dto/trainer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Trainers')
@Controller('trainers')
export class TrainersController {
  constructor(private trainersService: TrainersService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список тренеров' })
  findAll() {
    return this.trainersService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить тренера по ID' })
  findOne(@Param('id') id: string) {
    return this.trainersService.findOne(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать тренера' })
  create(@Body() dto: CreateTrainerDto) {
    return this.trainersService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить тренера' })
  update(@Param('id') id: string, @Body() dto: UpdateTrainerDto) {
    return this.trainersService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить тренера' })
  remove(@Param('id') id: string) {
    return this.trainersService.remove(+id);
  }
}
