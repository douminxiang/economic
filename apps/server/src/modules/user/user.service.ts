import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, phone: true, nickname: true, avatar: true, gender: true, createdAt: true, updatedAt: true },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, phone: true, nickname: true, avatar: true, gender: true, createdAt: true, updatedAt: true },
    });
  }
}
