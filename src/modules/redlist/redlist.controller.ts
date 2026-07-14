import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AdminRole } from '../../shared/interfaces/role.interface';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { RedlistService } from './redlist.service';
import {
  CreateCaseDto,
  UpdateCaseDto,
  ChangeCaseStatusDto,
  QueryCasesDto,
  LinkEntityDto,
  AddEvidenceDto,
} from './dto/redlist.dto';
import { AppResponse } from '../../shared/utils/app.response';
import { FileInterceptor } from '@nestjs/platform-express';
import { QueryEvidenceDto } from '../audit/dto/audit.dto';

@Controller('redlist-cases')
export class RedlistController {
  constructor(private readonly redlistService: RedlistService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.redlistService.create(dto, user);
    return AppResponse.success(
      'Redlist case created',
      HttpStatus.CREATED,
      data,
    );
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
  async list(@Query() query: QueryCasesDto) {
    const data = await this.redlistService.list(query);
    return AppResponse.success('Redlist cases retrieved', HttpStatus.OK, data);
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
    const data = await this.redlistService.findCaseById(id);
    return AppResponse.success('Redlist case retrieved', HttpStatus.OK, data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.redlistService.update(id, dto, user);
    return AppResponse.success('Redlist case updated', HttpStatus.OK, data);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeCaseStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.redlistService.changeStatus(id, dto, user);
    return AppResponse.success(
      'Redlist case status updated',
      HttpStatus.OK,
      data,
    );
  }

  @Post(':id/entities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.CREATED)
  async linkEntity(
    @Param('id') id: string,
    @Body() dto: LinkEntityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.redlistService.linkEntity(id, dto, user);
    return AppResponse.success(
      'Entity linked to case',
      HttpStatus.CREATED,
      data,
    );
  }

  @Get(':id/entities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async listEntities(@Param('id') id: string) {
    const data = await this.redlistService.listEntities(id); // wraps findEntitiesByCase + shapes
    return AppResponse.success('Case entities retrieved', HttpStatus.OK, data);
  }

  @Delete(':id/entities/:entityLinkId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async unlinkEntity(
    @Param('id') id: string,
    @Param('entityLinkId') entityLinkId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.redlistService.unlinkEntity(id, entityLinkId, user);
    return AppResponse.success(
      'Entity unlinked from case',
      HttpStatus.OK,
      data,
    );
  }

  @Get('companies/:company_id/redlist-cases')
  async listCompanyCases(
    @Param('company_id') companyId: string,
    @Query() query: QueryCasesDto,
  ) {
    const data = await this.redlistService.listCasesForCompany(
      companyId,
      query,
    );

    return AppResponse.success(
      'Company cases retrieved successfully',
      HttpStatus.OK,
      data,
    );
  }

  @Get('individuals/:individual_id/redlist-cases')
  async listIndividualCases(
    @Param('individual_id') individualId: string,
    @Query() query: QueryCasesDto,
  ) {
    const data = await this.redlistService.listCasesForIndividual(
      individualId,
      query,
    );

    return AppResponse.success(
      'Individual cases retrieved successfully',
      HttpStatus.OK,
      data,
    );
  }

  @Post(':id/evidence')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async addEvidence(
    @Param('id') id: string,
    @Body() dto: AddEvidenceDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /(pdf|jpeg|png)$/ }),
        ],
        fileIsRequired: false, // required only when kind=DOCUMENT (service enforces)
      }),
    )
    file?: Express.Multer.File,
  ) {
    const data = await this.redlistService.addEvidence(id, dto, user, file);
    return AppResponse.success('Evidence added', HttpStatus.CREATED, data);
  }

  @Get(':id/evidence')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async listEvidence(
    @Param('id') id: string,
    @Query() query: QueryEvidenceDto,
  ) {
    const data = await this.redlistService.listEvidence(id, query);
    return AppResponse.success('Evidence retrieved', HttpStatus.OK, data);
  }

  @Get(':id/evidence/:evidenceId/view')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async viewEvidence(
    @Param('id') id: string,
    @Param('evidenceId') evidenceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.redlistService.getEvidenceViewUrl(
      id,
      evidenceId,
      user,
    );
    return AppResponse.success('Evidence URL generated', HttpStatus.OK, data);
  }

  @Delete(':id/evidence/:evidenceId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async removeEvidence(
    @Param('id') id: string,
    @Param('evidenceId') evidenceId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.redlistService.removeEvidence(id, evidenceId, user);
    return AppResponse.success('Evidence removed', HttpStatus.OK, data);
  }

  // DELETE /redlist-cases/:id — soft-deletes a redlist case (clears entity flags)
  @Delete(':id/softdelete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async softDeleteCase(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.redlistService.softDeleteCase(id, user);
    return AppResponse.success('Case deleted', HttpStatus.OK, data);
  }

  // PATCH /redlist-cases/:id/restore — restores a soft-deleted case (re-flags if active)
  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async restoreCase(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.redlistService.restoreCase(id, user);
    return AppResponse.success('Case restored', HttpStatus.OK, data);
  }

  // GET /redlist-cases/companies/:companyId/summary — redlist panel counts for a company
  @Get('companies/:companyId/summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async getCompanyRedlistSummary(@Param('companyId') companyId: string) {
    const data = await this.redlistService.getCompanyRedlistSummary(companyId);
    return AppResponse.success(
      'Redlist summary retrieved',
      HttpStatus.OK,
      data,
    );
  }
}
