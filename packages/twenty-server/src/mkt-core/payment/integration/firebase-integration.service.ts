import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { MKT_PAYMENT_STATUS } from 'src/mkt-core/dev-seeder/constants/mkt-payment-data-seeds.constants';
import { Metadata } from 'src/mkt-core/order/hooks/mkt-order-create-one.post-query.hook';
import { MktOrderWorkspaceEntity } from 'src/mkt-core/order/objects/mkt-order.workspace-entity';

export interface FirebaseAuthResponse {
  idToken: string;
  refreshToken: string;
  localId: string;
}

@Injectable()
export class FireBaseIntegrationService {
  private readonly logger = new Logger(FireBaseIntegrationService.name);
  private readonly firebaseKey: string;
  private readonly firebaseDbUrl: string;
  private readonly firebaseAuthUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.firebaseKey = process.env.FIREBASE_KEY || '';
    this.firebaseDbUrl = process.env.FIREBASE_DB_URL || '';
    this.firebaseAuthUrl = process.env.FIREBASE_AUTH_URL || '';
  }

  async getUser(orderCode: string) {
    if (!orderCode) return;
    try {
      const firebaseUrl = `${this.firebaseAuthUrl}${this.firebaseKey}`;
      this.logger.log('Firebase URL: ' + firebaseUrl);
      this.logger.log('Order Code: ' + orderCode);
      const response = await firstValueFrom(
        this.httpService.post<FirebaseAuthResponse>(firebaseUrl),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get user ${orderCode} from Firebase`, error);
      throw new Error(`Firebase user retrieval failed: ${error.message}`);
    }
  }

  async authenticateWithFirebase(): Promise<FirebaseAuthResponse | void> {
    try {
      const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.firebaseKey}`;

      const response = await firstValueFrom(
        this.httpService.post<FirebaseAuthResponse>(signUpUrl),
      );

      this.logger.log('Firebase authentication successful');
      return response.data;
    } catch (error) {
      this.logger.error('Failed to authenticate with Firebase', error);
      return;
      //throw new Error(`Firebase authentication failed: ${error.message}`);
    }
  }

  async pendingOrderToFirebase(
    authData: FirebaseAuthResponse,
    orderCode: string,
    qrCodeUrl: string,
    note: string = '',
  ): Promise<void> {
    if (!authData || !authData.idToken) return;
    if (!orderCode) return;
    if (!qrCodeUrl) return;
    try {
      await this.sendOrderToFirebase(
        authData,
        orderCode,
        MKT_PAYMENT_STATUS.PENDING,
        note,
      );
      this.logger.log(
        `Pending order ${orderCode} sent to Firebase with QR Code URL: ${qrCodeUrl}`,
      );
    } catch (error) {
      this.logger.error('Failed to send pending order to Firebase', error);
      //throw new Error(`Firebase pending order sync failed: ${error.message}`);
    }
  }

  async completedOrderToFirebase(
    order: Partial<MktOrderWorkspaceEntity>,
    note: string = '',
  ): Promise<void> {
    this.logger.log(
      `Preparing to send completed order ${order?.orderCode} to Firebase`,
    );
    let metadata = order?.metadata as Metadata;
    // Handle case where metadata might be stored as JSON string
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch (error) {
        throw new Error(`Failed to parse metadata JSON: ${error.message}`);
      }
    }
    this.logger.log('Metadata: ' + JSON.stringify(metadata));

    const authData = metadata?.authFirebase as FirebaseAuthResponse | void;
    const orderCode = order?.orderCode || null;
    this.logger.log('Auth Data: ' + JSON.stringify(authData));
    this.logger.log('Order Code: ' + orderCode);
    if (!authData || !authData?.idToken) return;
    if (!orderCode) return;
    try {
      await this.sendOrderToFirebase(
        authData,
        orderCode,
        MKT_PAYMENT_STATUS.COMPLETED,
        note,
      );
      this.logger.log(`Completed order ${orderCode} sent to Firebase`);
    } catch (error) {
      this.logger.error('Failed to send completed order to Firebase', error);
      //throw new Error(`Firebase completed order sync failed: ${error.message}`);
    }
  }

  private async sendOrderToFirebase(
    authData: FirebaseAuthResponse,
    orderCode: string,
    status: MKT_PAYMENT_STATUS,
    note: string = '',
  ): Promise<void> {
    try {
      // Step 1: Get Firebase authentication
      //const authData = await this.authenticateWithFirebase();

      // Step 2: Send order info to Firebase
      const firebaseUrl = `${this.firebaseDbUrl}/${orderCode}.json?auth=${authData.idToken}`;

      const orderData = {
        ownerId: authData.localId,
        code: orderCode,
        status: status,
        note: note,
      };

      await firstValueFrom(
        this.httpService.put(firebaseUrl, orderData, {
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      this.logger.log(
        `Successfully sent order ${orderCode} to Firebase with status ${status}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send order ${orderCode} to Firebase`, error);
      //throw new Error(`Firebase order sync failed: ${error.message}`);
    }
  }

  async syncOrderStatus(
    authData: FirebaseAuthResponse,
    orderCode: string | null,
    qrCodeUrl: string,
    status: MKT_PAYMENT_STATUS,
  ): Promise<void> {
    if (!orderCode) {
      this.logger.warn('No order code provided for Firebase sync');
      return;
    }

    try {
      //await this.sendOrderToFirebase(authData, orderCode, status);
      this.logger.log(
        `Synced order ${orderCode} with status ${status} and QR Code URL: ${qrCodeUrl}`,
      );
    } catch (error) {
      this.logger.error('Failed to sync order status with Firebase', error);
      // Don't throw here to prevent breaking the main order flow
    }
  }
}
