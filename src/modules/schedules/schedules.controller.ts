import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  async findAll(@CurrentUser() user: { userId: string; tenantId: string }) {
    return this.schedulesService.findAll(user.tenantId);
  }

  @Post()
  async create(
    @CurrentUser() user: { userId: string; tenantId: string },
    @Body() dto: CreateScheduleDto,
  ) {
    return this.schedulesService.create(user.tenantId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { userId: string; tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.schedulesService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: { userId: string; tenantId: string },
    @Param('id') id: string,
  ) {
    return this.schedulesService.remove(user.tenantId, id);
  }
}
