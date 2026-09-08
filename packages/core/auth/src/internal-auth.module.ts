import { type DynamicModule, Global, Module } from '@nestjs/common';
import { AccessGuard } from './guard/access.guard.js';
import { GraphqlAccessGuard } from './guard/graphql-access.guard.js';
import { type InternalAuthOptions, InternalAuthService } from './service/internal-auth.service.js';

export const INTERNAL_AUTH_OPTIONS = 'INTERNAL_AUTH_OPTIONS';

export interface InternalAuthModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<InternalAuthOptions> | InternalAuthOptions;
}

@Global()
@Module({})
export class InternalAuthModule {
  static forRootAsync(options: InternalAuthModuleAsyncOptions): DynamicModule {
    return {
      module: InternalAuthModule,
      imports: options.imports ?? [],
      providers: [
        { provide: INTERNAL_AUTH_OPTIONS, useFactory: options.useFactory, inject: options.inject ?? [] },
        {
          provide: InternalAuthService,
          useFactory: (authOptions: InternalAuthOptions) => new InternalAuthService(authOptions),
          inject: [INTERNAL_AUTH_OPTIONS],
        },
        AccessGuard,
        GraphqlAccessGuard,
      ],
      exports: [InternalAuthService, AccessGuard, GraphqlAccessGuard],
    };
  }
}
