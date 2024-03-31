import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpException,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { MaintenanceRequestsService } from './maintenance-requests.service';
import { MaintenanceRequest } from './schemas/maintenanceRequest.schema';
import { CreateMaintenaceRequestDTO } from './dto/create-maintenanceRequest.dto';
import { UpdateMaintenanceRequestDTO } from './dto/update-maintenanceRequest.dto';
import { Query as ExpressQuery } from 'express-serve-static-core';
import { Roles } from 'src/auth/config/decorator/roles.decorator';
import { UserRole } from 'src/auth/schemas/user.schema';
import { Request } from 'express';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from 'src/file_upload/file_upload.service';

export interface AuthRequest extends Request {
  user?: {
    _id?: string;
    location?: string;
    role?: string;
  };
}

@Controller('maintenance-requests')
export class MaintenanceRequestsController {
  constructor(
    private maintenanceService: MaintenanceRequestsService,
    private readonly fileUploadService: FileUploadService,
  ) {}
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllMaintenanceRequests() {
    return this.maintenanceService.getAllMaintenanceRequests();
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/user/:uid')
  @Roles(UserRole.ADMIN)
  async getRequestsbyUserId(@Param('uid') userId: string) {
    return this.maintenanceService.findRequestsByUserIdforAdmin(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/user')
  @Roles(UserRole.CLIENT)
  async getAllUserMaintenanceRequests(
    @Req() request: AuthRequest,
    // @Param('uid') uIdFromParam: string,
    @Query() query: ExpressQuery,
  ): Promise<MaintenanceRequest[]> {
    const userId = request.user._id;
    // if (userId.toString() !== uIdFromParam) {
    //   throw new ForbiddenException(
    //     "Vous n'êtes pas autorisé à accéder à cette ressource",
    //   );
    // }

    return this.maintenanceService.findAllUserRequests(userId, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image'))
  @Roles(UserRole.CLIENT)
  async createMaintenanceRequest(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: /(jpg|jpeg|png)$/i })],
      }),
    )
    image: Express.Multer.File,
    @Req() request: AuthRequest,
    @Body() maintenanceRequestData: CreateMaintenaceRequestDTO,
  ) {
    console.log(image);
    const imagePath = this.fileUploadService.uploadImage(image);
    const userId = request.user._id;
    return this.maintenanceService.create(
      userId,
      maintenanceRequestData,
      imagePath,
    );
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':mid')
  @Roles(UserRole.CLIENT)
  async getSingleMaintenanceRequest(
    @Param('mid') id: string,
    @Req() request: AuthRequest,
  ): Promise<MaintenanceRequest> {
    const userId = request.user._id;
    return this.maintenanceService.findSingleMaintenanceRequest(id, userId);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':mid')
  @Roles(UserRole.CLIENT)
  async updateMaintenanceRequest(
    @Param('mid') id: string,
    @Req() request: AuthRequest,
    @Body() maintenanceRequestData: UpdateMaintenanceRequestDTO,
  ): Promise<MaintenanceRequest> {
    try {
      const userId = request.user._id;
      const updatedRequest =
        await this.maintenanceService.updateMaintenanceRequest(
          id,
          userId,
          maintenanceRequestData,
        );
      return updatedRequest;
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':mid')
  @Roles(UserRole.CLIENT)
  async deleteMaintenanceRequest(
    @Param('mid') id: string,
    @Req() request: AuthRequest,
  ): Promise<MaintenanceRequest> {
    try {
      const userId = request.user._id;
      const deletedRequest = await this.maintenanceService.deleteById(
        id,
        userId,
      );
      return deletedRequest;
    } catch (error) {
      throw new HttpException(error.message, error.status);
    }
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('/nearby/:id')
  @Roles(UserRole.TECHNICIAN)
  async getMaintenanceRequestForTech(@Param('id') technicianId: string) {
    return await this.maintenanceService.getNearbyMaintenance(technicianId);
  }
}
