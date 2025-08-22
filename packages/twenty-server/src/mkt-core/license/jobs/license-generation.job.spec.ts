import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ScopedWorkspaceContextFactory } from 'src/engine/twenty-orm/factories/scoped-workspace-context.factory';
import { TwentyORMGlobalManager } from 'src/engine/twenty-orm/twenty-orm-global.manager';
import { MktLicenseApiService } from 'src/mkt-core/license/mkt-license-api.service';
import { MKT_LICENSE_STATUS } from 'src/mkt-core/license/mkt-license.workspace-entity';
import { OrderStatus } from 'src/mkt-core/order/constants/order-status.constants';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/mkt-order.workspace-entity';
import {
  LicenseGenerationJob,
  LicenseGenerationJobData,
} from './license-generation.job';

describe('LicenseGenerationJob', () => {
  let job: LicenseGenerationJob;
  let mktLicenseApiService: jest.Mocked<MktLicenseApiService>;
  let twentyORMGlobalManager: jest.Mocked<TwentyORMGlobalManager>;
  let scopedWorkspaceContextFactory: jest.Mocked<ScopedWorkspaceContextFactory>;

  const mockOrderRepository = {
    findOne: jest.fn(),
  };

  const mockLicenseRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWorkspaceContext = {
    workspaceId: 'test-workspace-id',
    userWorkspaceId: 'test-workspace-id',
    isExecutedByApiKey: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenseGenerationJob,
        {
          provide: MktLicenseApiService,
          useValue: {
            fetchLicenseFromApi: jest.fn(),
          },
        },
        {
          provide: TwentyORMGlobalManager,
          useValue: {
            getRepositoryForWorkspace: jest.fn(),
          },
        },
        {
          provide: ScopedWorkspaceContextFactory,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    job = module.get<LicenseGenerationJob>(LicenseGenerationJob);
    mktLicenseApiService = module.get(MktLicenseApiService);
    twentyORMGlobalManager = module.get(TwentyORMGlobalManager);
    scopedWorkspaceContextFactory = module.get(ScopedWorkspaceContextFactory);

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    const jobData: LicenseGenerationJobData = {
      orderId: 'test-order-id',
      workspaceId: 'test-workspace-id',
    };

    const mockOrder: Partial<MktOrderWorkspaceEntity> = {
      id: 'test-order-id',
      name: 'Test Order',
      status: OrderStatus.PAID,
    };

    const mockLicenseApiResponse = {
      licenseKey: 'LIC-TEST-1234567890',
      status: 'active',
      expiresAt: '2024-12-31T23:59:59Z',
    };

    it('should successfully generate license for order', async () => {
      // Arrange
      scopedWorkspaceContextFactory.create.mockReturnValue(
        mockWorkspaceContext,
      );
      twentyORMGlobalManager.getRepositoryForWorkspace
        .mockResolvedValueOnce(mockOrderRepository as any)
        .mockResolvedValueOnce(mockLicenseRepository as any);

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockLicenseRepository.find.mockResolvedValue([]);
      mktLicenseApiService.fetchLicenseFromApi.mockResolvedValue(
        mockLicenseApiResponse,
      );

      const mockNewLicense = {
        name: 'License for Test Order',
        licenseKey: mockLicenseApiResponse.licenseKey,
        status: MKT_LICENSE_STATUS.ACTIVE,
        activatedAt: expect.any(String),
        expiresAt: mockLicenseApiResponse.expiresAt,
        mktOrderId: jobData.orderId,
      };

      mockLicenseRepository.create.mockReturnValue(mockNewLicense as any);
      mockLicenseRepository.save.mockResolvedValue(mockNewLicense as any);

      // Act
      await job.handle(jobData);

      // Assert
      expect(mktLicenseApiService.fetchLicenseFromApi).toHaveBeenCalledWith(
        jobData.orderId,
        mockOrder.name,
      );
      expect(mockLicenseRepository.create).toHaveBeenCalledWith(mockNewLicense);
      expect(mockLicenseRepository.save).toHaveBeenCalledWith(mockNewLicense);
    });

    it('should skip if order not found', async () => {
      // Arrange
      scopedWorkspaceContextFactory.create.mockReturnValue(
        mockWorkspaceContext,
      );
      twentyORMGlobalManager.getRepositoryForWorkspace.mockResolvedValueOnce(
        mockOrderRepository as any,
      );
      mockOrderRepository.findOne.mockResolvedValue(null);

      // Act
      await job.handle(jobData);

      // Assert
      expect(mktLicenseApiService.fetchLicenseFromApi).not.toHaveBeenCalled();
      expect(mockLicenseRepository.create).not.toHaveBeenCalled();
    });

    it('should skip if license already exists', async () => {
      // Arrange
      scopedWorkspaceContextFactory.create.mockReturnValue(
        mockWorkspaceContext,
      );
      twentyORMGlobalManager.getRepositoryForWorkspace
        .mockResolvedValueOnce(mockOrderRepository as any)
        .mockResolvedValueOnce(mockLicenseRepository as any);

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockLicenseRepository.find.mockResolvedValue([
        { id: 'existing-license' },
      ]);

      // Act
      await job.handle(jobData);

      // Assert
      expect(mktLicenseApiService.fetchLicenseFromApi).not.toHaveBeenCalled();
      expect(mockLicenseRepository.create).not.toHaveBeenCalled();
    });

    it('should handle API error', async () => {
      // Arrange
      const apiError = new Error('API Error');
      scopedWorkspaceContextFactory.create.mockReturnValue(
        mockWorkspaceContext,
      );
      twentyORMGlobalManager.getRepositoryForWorkspace
        .mockResolvedValueOnce(mockOrderRepository as any)
        .mockResolvedValueOnce(mockLicenseRepository as any);

      mockOrderRepository.findOne.mockResolvedValue(mockOrder);
      mockLicenseRepository.find.mockResolvedValue([]);
      mktLicenseApiService.fetchLicenseFromApi.mockRejectedValue(apiError);

      // Act & Assert
      await expect(job.handle(jobData)).rejects.toThrow(apiError);
      expect(mockLicenseRepository.create).not.toHaveBeenCalled();
    });
  });
});
