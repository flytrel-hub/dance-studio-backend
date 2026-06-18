import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Получить уведомления' })
  findAll(@Req() req: any) {
    return this.notificationsService.findAll(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Количество непрочитанных' })
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Отметить как прочитанное' })
  markAsRead(@Param('id') id: string, @Req() req: any) {
    return this.notificationsService.markAsRead(+id, req.user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Отметить все как прочитанные' })
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Удалить старые уведомления (3+ дней)' })
  cleanup() {
    return this.notificationsService.cleanup();
  }
}
