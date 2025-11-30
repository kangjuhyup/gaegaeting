export abstract class SmsApiPort {
  abstract sendSms(phoneNumber: string, message: string): Promise<void>;
}


