import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { Request, Response } from 'express';

import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { UserAuthGuard } from 'src/engine/guards/user-auth.guard';

import { MktLicenseCsvExportService } from './mkt-license-csv-export.service';

@Controller('api/admin/license')
export class MktLicenseCsvExportController {
  constructor(private readonly csvExportService: MktLicenseCsvExportService) {}

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
      // Use a proper logger instead of console
      // This is a temporary console replacement that should be replaced with proper logging
      // eslint-disable-next-line no-console
      console.error('Failed to extract workspaceId from token:', error);
    }

    return undefined;
  }

  @UseGuards(JwtAuthGuard, UserAuthGuard)
  @Get('export-dashboard-csv')
  async exportDashboardCsv(
    @Query('reportType') reportType = 'license-dashboard',
    @Query('workspaceId') workspaceId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!reportType) {
        throw new HttpException(
          'Report type is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract workspaceId from JWT token if not provided in query
      const targetWorkspaceId =
        workspaceId || this.extractWorkspaceIdFromRequest(req);

      const exportData = await this.csvExportService.exportLicenseDashboardCsv(
        reportType,
        targetWorkspaceId,
      );

      if (!exportData) {
        throw new HttpException(
          'Failed to generate export data',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const fileName = `license-dashboard-${new Date().toISOString().split('T')[0]}.csv`;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${fileName}"`,
      );
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Pragma', 'no-cache');

      res.send(exportData.data);
    } catch (error) {
      throw new HttpException(
        `Failed to export CSV: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, UserAuthGuard)
  @Get('dashboard-report')
  async getDashboardReport(
    @Query('reportType') reportType = 'license-dashboard',
    @Query('workspaceId') workspaceId: string,
    @Req() req: Request,
  ) {
    try {
      if (!reportType) {
        throw new HttpException(
          'Report type is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const targetWorkspaceId =
        workspaceId || this.extractWorkspaceIdFromRequest(req);

      const exportData = await this.csvExportService.exportLicenseDashboardCsv(
        reportType,
        targetWorkspaceId,
      );

      if (!exportData) {
        throw new HttpException(
          'Failed to generate export data',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      const report = this.csvExportService.generateDashboardReport(
        exportData.metadata,
      );

      return {
        reportType: exportData.reportType,
        //workspaceName: exportData.workspaceName,
        generatedAt: exportData.generatedAt,
        report,
        statistics: exportData.metadata,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to generate report: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @UseGuards(JwtAuthGuard, UserAuthGuard)
  @Get('export-statistics-json')
  async exportStatisticsJson(
    @Query('reportType') reportType = 'license-dashboard',
    @Query('workspaceId') workspaceId: string,
    @Req() req: Request,
  ) {
    try {
      if (!reportType) {
        throw new HttpException(
          'Report type is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const targetWorkspaceId =
        workspaceId || this.extractWorkspaceIdFromRequest(req);

      const exportData = await this.csvExportService.exportLicenseDashboardCsv(
        reportType,
        targetWorkspaceId,
      );

      return {
        success: true,
        data: exportData,
      };
    } catch (error) {
      throw new HttpException(
        `Failed to export statistics: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
