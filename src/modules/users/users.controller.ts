import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  findMe(@CurrentUser() user: { userId: string }) {
    return this.usersService.findMe(user.userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateMe(user.userId, dto);
  }

  @Get()
  @Roles('OWNER', 'ADMIN')
  @UseGuards(RolesGuard)
  findAll(
    @CurrentUser() user: { tenantId: string },
    @Query() pagination: PaginationDto,
  ) {
    return this.usersService.findAll(user.tenantId, pagination);
  }

  @Patch(':id')
  @Roles('OWNER')
  @UseGuards(RolesGuard)
  updateRole(
    @Param('id') id: string,
    @CurrentUser() user: { tenantId: string },
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, user.tenantId, dto);
  }
}
