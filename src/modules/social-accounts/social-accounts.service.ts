import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateSocialAccountDto } from './dto/create-social-account.dto';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';

@Injectable()
export class SocialAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => ({
      ...account,
      accessToken: '***',
    }));
  }

  async create(tenantId: string, dto: CreateSocialAccountDto) {
    return this.prisma.socialAccount.create({
      data: {
        tenantId,
        platform: dto.platform,
        accountName: dto.accountName,
        accountId: dto.accountId,
        accessToken: dto.accessToken,
        tokenExpiresAt: dto.tokenExpiresAt
          ? new Date(dto.tokenExpiresAt)
          : undefined,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateSocialAccountDto) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException(`Social account ${id} not found`);
    }

    return this.prisma.socialAccount.update({
      where: { id },
      data: {
        ...dto,
        tokenExpiresAt: dto.tokenExpiresAt
          ? new Date(dto.tokenExpiresAt)
          : undefined,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException(`Social account ${id} not found`);
    }

    return this.prisma.socialAccount.delete({ where: { id } });
  }
}
