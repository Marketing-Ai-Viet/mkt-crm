import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { Request, Response } from 'express';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';
import { MktCustomerExportService } from 'src/mkt-core/customer/services/mkt-customer-export.service';

interface CustomerExportFilters {
  status?: string;
  tier?: string;
  type?: string;
  fromDate?: Date;
  toDate?: Date;
}

@Controller('api/mkt/customer')
export class MktCustomerExportController {
  private readonly logger = new Logger(MktCustomerExportController.name);

  constructor(
    private readonly customerExportService: MktCustomerExportService,
  ) {}

  private extractWorkspaceIdFromRequest(req: Request): string | undefined {
    try {
      // Extract from JWT token in Authorization header
      const token = req.headers.authorization?.replace('Bearer ', '');

      if (token) {
        // Decode JWT token (base64 decode the payload)
        const payload = JSON.parse(
          Buffer.from(token.split('.')[1], 'base64').toString(),
        );

        return payload.workspaceId;
      }
    } catch (error) {
      this.logger.error('Failed to extract workspaceId from token:', error);
    }

    return undefined;
  }

  @UseGuards(JwtAuthGuard, UserAuthGuard)
  @Get('export-csv')
  async exportCustomersCsv(
    @Query('workspaceId') workspaceId: string,
    @Query('status') status: string,
    @Query('tier') tier: string,
    @Query('type') type: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Extract workspaceId from JWT token if not provided in query
      const targetWorkspaceId =
        workspaceId || this.extractWorkspaceIdFromRequest(req);

      if (!targetWorkspaceId) {
        throw new HttpException(
          'Workspace ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const filters: CustomerExportFilters = {};

      if (status) filters.status = status;
      if (tier) filters.tier = tier;
      if (type) filters.type = type;
      if (fromDate) filters.fromDate = new Date(fromDate);
      if (toDate) filters.toDate = new Date(toDate);

      const exportData = await this.customerExportService.exportCustomersToCsv(
        targetWorkspaceId,
        filters,
      );

      if (!exportData) {
        throw new HttpException(
          'Failed to generate export data',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${exportData.fileName}"`,
      );
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('X-Total-Records', exportData.totalRecords.toString());

      res.send(exportData.data);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new HttpException(
        `Failed to export CSV: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, UserAuthGuard)
  @Get('export-statistics')
  async getExportStatistics(
    @Query('workspaceId') workspaceId: string,
    @Query('status') status: string,
    @Query('tier') tier: string,
    @Query('type') type: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Req() req: Request,
  ) {
    try {
      const targetWorkspaceId =
        workspaceId || this.extractWorkspaceIdFromRequest(req);

      if (!targetWorkspaceId) {
        throw new HttpException(
          'Workspace ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const filters: CustomerExportFilters = {};

      if (status) filters.status = status;
      if (tier) filters.tier = tier;
      if (type) filters.type = type;
      if (fromDate) filters.fromDate = new Date(fromDate);
      if (toDate) filters.toDate = new Date(toDate);

      const statistics = await this.customerExportService.getExportStatistics(
        targetWorkspaceId,
        filters,
      );

      return {
        success: true,
        data: statistics,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new HttpException(
        `Failed to get export statistics: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, UserAuthGuard)
  @Get('export-csv-stream')
  async exportCustomersCsvStream(
    @Query('workspaceId') workspaceId: string,
    @Query('status') status: string,
    @Query('tier') tier: string,
    @Query('type') type: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('batchSize') batchSize: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const targetWorkspaceId =
        workspaceId || this.extractWorkspaceIdFromRequest(req);

      if (!targetWorkspaceId) {
        throw new HttpException(
          'Workspace ID is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const filters: CustomerExportFilters = {};

      if (status) filters.status = status;
      if (tier) filters.tier = tier;
      if (type) filters.type = type;
      if (fromDate) filters.fromDate = new Date(fromDate);
      if (toDate) filters.toDate = new Date(toDate);

      const batch = batchSize ? parseInt(batchSize, 10) : 1000;

      const fileName = `customers-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`,
      );
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Transfer-Encoding', 'chunked');

      const stream = await this.customerExportService.exportCustomersStream(
        targetWorkspaceId,
        filters,
        batch,
      );

      for await (const chunk of stream) {
        res.write(chunk);
      }

      res.end();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new HttpException(
        `Failed to export CSV stream: ${errorMessage}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
