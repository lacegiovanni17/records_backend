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
import { CompaniesService } from './companies.service';
import {
  AddCompanyRelationshipDto,
  CreateCompanyDto,
  FlagCompanyDto,
  LinkPersonDto,
  QueryCompaniesDto,
  UpdateCompanyDto,
  UpdateLinkDto,
} from './dto/company.dto';
import { AppResponse } from '../../shared/utils/app.response';
import { CompanyPeopleService } from './company-people.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type {} from 'multer';
import { CompanyStructureService } from './company-structure.service';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly companyPeopleService: CompanyPeopleService,
    private readonly companyStructureService: CompanyStructureService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @UseInterceptors(FileInterceptor('file')) // key must be "file" in form-data
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpeg|png|webp)$/ }), // images only
        ],
        fileIsRequired: false, // logo is optional
      }),
    )
    file?: Express.Multer.File,
  ) {
    const data = await this.companiesService.create(dto, user, file);
    return AppResponse.success('Company created', HttpStatus.CREATED, data);
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
  async list(@Query() query: QueryCompaniesDto) {
    const result = await this.companiesService.list(query);
    return AppResponse.success('Companies retrieved', HttpStatus.OK, result);
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
    const data = await this.companiesService.findOne(id);
    return AppResponse.success('Company retrieved', HttpStatus.OK, data);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companiesService.update(id, dto, user);
    return AppResponse.success('Company updated', HttpStatus.OK, data);
  }

  @Patch(':id/flag')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async flag(
    @Param('id') id: string,
    @Body() dto: FlagCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companiesService.flag(id, dto, user);
    return AppResponse.success('Company flagged', HttpStatus.OK, data);
  }

  @Patch(':id/unflag')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async unflag(
    @Param('id') id: string,
    @Body() dto: FlagCompanyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companiesService.unflag(id, dto, user);
    return AppResponse.success('Company unflagged', HttpStatus.OK, data);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companiesService.archive(id, user);
    return AppResponse.success('Company archived', HttpStatus.OK, data);
  }

  @Patch(':id/unarchive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.OK)
  async unarchive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companiesService.unarchive(id, user);
    return AppResponse.success('Company unarchived', HttpStatus.OK, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async softDelete(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companiesService.softDelete(id, user);
    return AppResponse.success('Company deleted', HttpStatus.OK, data);
  }

  @Patch(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companiesService.restore(id, user);
    return AppResponse.success('Company restored', HttpStatus.OK, data);
  }

  @Get(':id/activity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async activity(@Param('id') id: string, @Query() query: QueryCompaniesDto) {
    const data = await this.companiesService.getActivity(
      id,
      query.page,
      query.limit,
    );
    return AppResponse.success(
      'Company activity retrieved',
      HttpStatus.OK,
      data,
    );
  }

  @Post(':id/people')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  async linkPerson(
    @Param('id') id: string,
    @Body() dto: LinkPersonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companyPeopleService.linkPerson(id, dto, user);
    return AppResponse.success(
      'Person linked to company',
      HttpStatus.CREATED,
      data,
    );
  }

  @Get(':id/people')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async getCompanyPeople(@Param('id') id: string) {
    const data = await this.companyPeopleService.getCompanyPeople(id);
    return AppResponse.success('Company people retrieved', HttpStatus.OK, data);
  }

  @Patch(':id/people/:individualId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.OK)
  async updateLink(
    @Param('id') id: string,
    @Param('individualId') individualId: string,
    @Body() dto: UpdateLinkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companyPeopleService.updateLink(
      id,
      individualId,
      dto,
      user,
    );
    return AppResponse.success('Link updated', HttpStatus.OK, data);
  }

  @Delete(':id/people/:individualId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async removeLink(
    @Param('id') id: string,
    @Param('individualId') individualId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companyPeopleService.removeLink(
      id,
      individualId,
      user,
    );
    return AppResponse.success(
      'Person unlinked from company',
      HttpStatus.OK,
      data,
    );
  }

  // GET /companies/:id/structure — flat graph (nodes + edges) + summary + risk for the Structure tab
  @Get(':id/structure')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async getCompanyStructure(@Param('id') id: string) {
    const data = await this.companyStructureService.getCompanyStructure(id);
    return AppResponse.success(
      'Company structure retrieved',
      HttpStatus.OK,
      data,
    );
  }

  // POST /companies/:id/relationships — adds a subsidiary/investment edge from this company
  @Post(':id/relationships')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @HttpCode(HttpStatus.CREATED)
  async addCompanyRelationship(
    @Param('id') id: string,
    @Body() dto: AddCompanyRelationshipDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.companyStructureService.addCompanyRelationship(
      id,
      dto,
      user,
    );
    return AppResponse.success('Relationship added', HttpStatus.CREATED, data);
  }
}
