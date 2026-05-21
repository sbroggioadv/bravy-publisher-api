import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SocialAccountsService } from './social-accounts.service';
import { CreateSocialAccountDto } from './dto/create-social-account.dto';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@ApiTags('social-accounts')
@ApiBearerAuth()
@Controller('social-accounts')
export class SocialAccountsController {
  constructor(private readonly socialAccountsService: SocialAccountsService) {}

  @Get()
  async findAll(@CurrentTenant() tenantId: string) {
    return this.socialAccountsService.findAll(tenantId);
  }

  @Post()
  async create(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateSocialAccountDto,
  ) {
    return this.socialAccountsService.create(tenantId, dto);
  }

  @Patch(':id')
  async update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSocialAccountDto,
  ) {
    return this.socialAccountsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  async remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.socialAccountsService.remove(tenantId, id);
  }
}
