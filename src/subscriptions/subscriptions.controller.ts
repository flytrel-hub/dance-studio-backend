import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Список абонементов' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('clientId') clientId?: number, @Query('status') status?: string) {
    return this.subscriptionsService.findAll({ clientId, status });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить абонемент по ID' })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(+id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать абонемент' })
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить абонемент' })
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(+id, dto);
  }

  @Post('request')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Запросить абонемент' })
  requestSubscription(@Req() req: any, @Body() body: { type: string; price: number }) {
    return this.subscriptionsService.requestSubscription(req.user.id, body.type, body.price);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Одобрить заявку на абонемент' })
  approveSubscription(@Param('id') id: string, @Body() body: { startDate: string; endDate: string }) {
    return this.subscriptionsService.approveSubscription(+id, body.startDate, body.endDate);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Отклонить заявку на абонемент' })
  rejectSubscription(@Param('id') id: string) {
    return this.subscriptionsService.rejectSubscription(+id);
  }

  @Post(':id/freeze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Заморозить абонемент' })
  freeze(@Param('id') id: string) {
    return this.subscriptionsService.freeze(+id);
  }

  @Post(':id/unfreeze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(200)
  @ApiOperation({ summary: 'Разморозить абонемент' })
  unfreeze(@Param('id') id: string) {
    return this.subscriptionsService.unfreeze(+id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить абонемент' })
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(+id);
  }
}
