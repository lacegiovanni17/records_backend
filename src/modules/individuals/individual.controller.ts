import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AdminRole } from '../../shared/interfaces/role.interface';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { IndividualsService } from './individual.service';
import {
  CreateIndividualDto,
  FlagIndividualDto,
  QueryIndividualsDto,
  UpdateIndividualDto,
} from './dto/individual.dto';
import { AppResponse } from '../../shared/utils/app.response';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('individuals')
export class IndividualsController {
  constructor(private readonly individualsService: IndividualsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateIndividualDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    const data = await this.individualsService.create(dto, user, file);
    return AppResponse.success('Individual created', HttpStatus.CREATED, data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIndividualDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    file?: Express.Multer.File,
  ) {
    const data = await this.individualsService.update(id, dto, user, file);
    return AppResponse.success('Individual updated', HttpStatus.OK, data);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const data = await this.individualsService.findOne(id);
    return AppResponse.success('Individual retrieved', HttpStatus.OK, data);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async list(@Query() query: QueryIndividualsDto) {
    const data = await this.individualsService.list(query);
    return AppResponse.success('Individuals retrieved', HttpStatus.OK, data);
  }

  @Patch(':id/flag')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async flag(
    @Param('id') id: string,
    @Body() dto: FlagIndividualDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.individualsService.flag(id, dto, user);
    return AppResponse.success('Individual flagged', HttpStatus.OK, data);
  }

  @Patch(':id/unflag')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async unflag(
    @Param('id') id: string,
    @Body() dto: FlagIndividualDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.individualsService.unflag(id, dto, user);
    return AppResponse.success('Individual unflagged', HttpStatus.OK, data);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.individualsService.archive(id, user);
    return AppResponse.success('Individual archived', HttpStatus.OK, data);
  }

  @Patch(':id/unarchive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.OK)
  async unarchive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.individualsService.unarchive(id, user);
    return AppResponse.success('Individual unarchived', HttpStatus.OK, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.individualsService.softDelete(id, user);
    return AppResponse.success('Individual deleted', HttpStatus.OK, data);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.individualsService.restore(id, user);
    return AppResponse.success('Individual restored', HttpStatus.OK, data);
  }

  @Get(':id/companies')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async getIndividualCompanies(@Param('id') id: string) {
    const data = await this.individualsService.getIndividualCompanies(id);
    return AppResponse.success(
      'Individual companies retrieved',
      HttpStatus.OK,
      data,
    );
  }
}
