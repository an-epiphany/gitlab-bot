import { Module } from '@nestjs/common';
import { WebhookModule } from './webhook/webhook.module';
import { LoggerModule } from 'nestjs-pino';
import * as process from 'process';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        name: 'gitlab-bot',
        autoLogging: false,
        quietReqLogger: true,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        transport: { target: 'pino-pretty' },
      },
    }),
    WebhookModule,
  ],
})
export class AppModule {}
