import { Injectable, NotFoundException } from '@nestjs/common';
import { SocialAccount } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { CreateSocialAccountDto } from './dto/create-social-account.dto';
import { UpdateSocialAccountDto } from './dto/update-social-account.dto';

@Injectable()
export class SocialAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findAll(tenantId: string) {
    const accounts = await this.prisma.socialAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return accounts.map((account) => this.toResponse(account));
  }

  async create(tenantId: string, dto: CreateSocialAccountDto) {
    const account = await this.prisma.socialAccount.create({
      data: {
        tenantId,
        platform: dto.platform,
        accountName: dto.accountName,
        accountId: dto.accountId,
        accessToken: this.encryption.encrypt(dto.accessToken),
        tokenExpiresAt: dto.tokenExpiresAt
          ? new Date(dto.tokenExpiresAt)
          : undefined,
      },
    });
    return this.toResponse(account);
  }

  async update(tenantId: string, id: string, dto: UpdateSocialAccountDto) {
    const account = await this.prisma.socialAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      throw new NotFoundException(`Social account ${id} not found`);
    }

    const updated = await this.prisma.socialAccount.update({
      where: { id },
      data: {
        ...dto,
        accessToken: dto.accessToken
          ? this.encryption.encrypt(dto.accessToken)
          : undefined,
        tokenExpiresAt: dto.tokenExpiresAt
          ? new Date(dto.tokenExpiresAt)
          : undefined,
      },
    });
    return this.toResponse(updated);
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

  /**
   * Returns the decrypted access token for publishing/insights flows.
   * Never expose this through the controller — only consumed server-side.
   */
  async getDecryptedToken(id: string): Promise<string> {
    const account = await this.prisma.socialAccount.findUniqueOrThrow({
      where: { id },
      select: { accessToken: true },
    });
    return this.encryption.decrypt(account.accessToken);
  }

  /**
   * Shape the row for the API client: hide the encrypted token blob and add a
   * derived `connected` flag (true when no expiry is set or expiry is in the
   * future). The frontend's AccountCard reads this to render the status pill.
   */
  private toResponse(account: SocialAccount) {
    const connected =
      !account.tokenExpiresAt || account.tokenExpiresAt.getTime() > Date.now();
    return {
      ...account,
      accessToken: '***',
      connected,
    };
  }
}
