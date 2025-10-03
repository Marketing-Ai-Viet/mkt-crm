import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  CALL_FIREBASE_DATA,
  FIREBASE_AUTH_RESPONSE,
} from 'src/mkt-core/common/common.type';
import { MKT_PAYMENT_STATUS } from 'src/mkt-core/dev-seeder/constants/mkt-payment-data-seeds.constants';

@Injectable()
export class MktFirebaseService {
  private readonly logger = new Logger(MktFirebaseService.name);
  private readonly firebaseKey: string;
  private readonly firebaseDbUrl: string;
  private readonly firebaseAuthUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.firebaseKey = process.env.FIREBASE_KEY || '';
    this.firebaseDbUrl = process.env.FIREBASE_DB_URL || '';
    this.firebaseAuthUrl = process.env.FIREBASE_AUTH_URL || '';
  }

  async callFireBase(
    fireBaseData: CALL_FIREBASE_DATA | void,
  ): Promise<FIREBASE_AUTH_RESPONSE | void> {
    if (!fireBaseData) return;
    if (!fireBaseData.orderCode) return;
    if (!fireBaseData.QRCodeUrl) return;
    const orderCode = fireBaseData.orderCode;
    const qrCodeUrl = fireBaseData.QRCodeUrl;

    try {
      this.logger.log(`Sending order ${orderCode} to Firebase`);
      // Send order info to Firebase with PENDING status
      const userFirebase = await this.authenticateWithFirebase();

      // Add null check for authentication result
      if (userFirebase) {
        await this.pendingOrderToFirebase(userFirebase, orderCode, qrCodeUrl);
      }

      this.logger.log('User Firebase: ' + JSON.stringify(userFirebase));
      this.logger.log(`Successfully sent order ${orderCode} to Firebase`);

      return userFirebase;
    } catch (error) {
      this.logger.error('Failed to call Firebase', error);

      // Don't throw to prevent breaking the order creation flow
      return;
    }
  }

  private async authenticateWithFirebase(): Promise<FIREBASE_AUTH_RESPONSE | void> {
    try {
      const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.firebaseKey}`;
      const response = await firstValueFrom(
        this.httpService.post<FIREBASE_AUTH_RESPONSE>(signUpUrl),
      );

      this.logger.log('Firebase authentication successful');

      return response.data;
    } catch (error) {
      this.logger.error('Failed to authenticate with Firebase (common)', error);

      return;
      //throw new Error(`Firebase authentication failed: ${error.message}`);
    }
  }

  private async pendingOrderToFirebase(
    authData: FIREBASE_AUTH_RESPONSE,
    orderCode: string,
    qrCodeUrl: string,
    note = '',
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

  private async sendOrderToFirebase(
    authData: FIREBASE_AUTH_RESPONSE,
    orderCode: string,
    status: MKT_PAYMENT_STATUS,
    note = '',
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
}
