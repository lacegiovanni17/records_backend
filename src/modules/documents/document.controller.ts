import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Get,
  Patch,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { AdminRole } from '../../shared/interfaces/role.interface';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../shared/interfaces/authenticated-user.interface';
import { DocumentsService } from './document.service';
import {
  RejectDocumentDto,
  RequestDocumentDto,
  UploadDocumentDto,
} from './dto/document.dto';
import { AppResponse } from '../../shared/utils/app.response';

@Controller('companies/:id/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER, AdminRole.EDITOR)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Param('id') companyId: string,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB — docs bigger than images
          new FileTypeValidator({ fileType: /(pdf|jpeg|png)$/ }), // KYC doc types
        ],
        fileIsRequired: true, // a document upload MUST have a file
      }),
    )
    file: Express.Multer.File,
  ) {
    const data = await this.documentsService.upload(companyId, dto, file, user);
    return AppResponse.success('Document uploaded', HttpStatus.CREATED, data);
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
  async list(@Param('id') companyId: string) {
    const data = await this.documentsService.listByCompany(companyId);
    return AppResponse.success('Documents retrieved', HttpStatus.OK, data);
  }

  @Get(':documentId/view')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async view(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.documentsService.getViewUrl(documentId, user);
    return AppResponse.success('Document URL generated', HttpStatus.OK, data);
  }

  @Patch(':documentId/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async verify(
    @Param('documentId') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.documentsService.verify(documentId, user);
    return AppResponse.success('Document verified', HttpStatus.OK, data);
  }

  @Patch(':documentId/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param('documentId') documentId: string,
    @Body() dto: RejectDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.documentsService.reject(documentId, dto, user);
    return AppResponse.success('Document rejected', HttpStatus.OK, data);
  }

  @Get('summary')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async summary(@Param('id') companyId: string) {
    const data = await this.documentsService.getSummary(companyId);
    return AppResponse.success(
      'Document summary retrieved',
      HttpStatus.OK,
      data,
    );
  }

  @Post('requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AdminRole.OVERSEER, AdminRole.APPROVER)
  @HttpCode(HttpStatus.CREATED)
  async requestDocument(
    @Param('id') companyId: string,
    @Body() dto: RequestDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const data = await this.documentsService.requestDocument(
      companyId,
      dto,
      user,
    );
    return AppResponse.success('Document requested', HttpStatus.CREATED, data);
  }

  @Get('requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    AdminRole.OVERSEER,
    AdminRole.APPROVER,
    AdminRole.EDITOR,
    AdminRole.VIEWER,
  )
  @HttpCode(HttpStatus.OK)
  async listRequests(@Param('id') companyId: string) {
    const data = await this.documentsService.listRequests(companyId);
    return AppResponse.success(
      'Document requests retrieved',
      HttpStatus.OK,
      data,
    );
  }
}
