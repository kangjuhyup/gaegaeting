import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { StorageService } from '@core/storage';
import { SlackModule } from '@core/slack';
import { ENV_KEY } from '../../config/env.config.js';
import { UserInfraStructureModule } from '../../user/infrastructure/infrastructure.module.js';
import { PetInfraStructureModule } from '../../pet/infrastructure/infrastructure.module.js';
import { ProfileImageRepositoryPort } from './profile-image-repository.port.js';
import { ProfileImageOrmRepository } from './profile-image-orm.repository.js';
import { PET_IMAGE_STORAGE, ProfileImageService, USER_IMAGE_STORAGE } from './profile-image.service.js';
import { ProfileImageResolver } from './profile-image.resolver.js';
import { ProfileImageNotificationPort } from './profile-image-notification.port.js';
import { ProfileImageSlackAdapter } from './profile-image-slack.adapter.js';

@Module({
  imports: [ConfigModule, UserInfraStructureModule, PetInfraStructureModule,
    SlackModule.forRootAsync({
      imports: [ConfigModule], inject: [ConfigService],
      useFactory: (config: ConfigService) => ({ webhookUrl: config.get<string>(ENV_KEY.SLACK_WEBHOOK_URL) || '' }),
    }),
  ],
  providers: [
    { provide: ProfileImageRepositoryPort, useClass: ProfileImageOrmRepository },
    { provide: ProfileImageNotificationPort, useClass: ProfileImageSlackAdapter },
    ...([[USER_IMAGE_STORAGE, 'STORAGE_USER_BUCKET'], [PET_IMAGE_STORAGE, 'STORAGE_PET_BUCKET']] as const).map(([provide, bucket]) => ({
      provide, inject: [ConfigService], useFactory: (config: ConfigService) => new StorageService(
        config.getOrThrow('STORAGE_REGION'), config.getOrThrow('STORAGE_HOST'), config.getOrThrow(bucket),
        config.getOrThrow('STORAGE_ACCESS_KEY_ID'), config.getOrThrow('STORAGE_SECRET_ACCESS_KEY'), config.getOrThrow('STORAGE_PROFILE_PREFIX'),
      ),
    })),
    ProfileImageService,
    ProfileImageResolver,
  ],
  exports: [ProfileImageService],
})
export class ProfileImageModule {}
