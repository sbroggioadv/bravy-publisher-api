import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRoleDto } from './dto/update-user.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const data: Record<string, unknown> = {};

    if (dto.name) data.name = dto.name;
    if (dto.email) data.email = dto.email;

    if (dto.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException(
          'currentPassword e obrigatorio ao alterar senha',
        );
      }
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('Usuario nao encontrado');
      }
      const valid = await bcrypt.compare(dto.currentPassword, user.password);
      if (!valid) {
        throw new UnauthorizedException('Senha atual incorreta');
      }
      data.password = await bcrypt.hash(dto.password, 12);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async findAll(tenantId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { tenantId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where: { tenantId } }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateRole(userId: string, tenantId: string, dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado neste tenant');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role as any },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }
}
