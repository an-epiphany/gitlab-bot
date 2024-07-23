import { Body, Controller, Headers, Logger, Param, Post } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { X_GITLAB_EVENT } from '../const';
import { Config } from '../config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Controller('webhook')
export class WebhookController {
  private logger = new Logger(WebhookController.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly httpService: HttpService,
  ) {}

  @Post(':path')
  async handleWebhook(
    @Param() params: any,
    @Body() body: any,
    @Headers() headers: any,
  ) {
    const { path } = params;

    // check webhookUrl
    const pushGroup = path.toUpperCase();
    const webhookUrl =
      process.env['WEBHOOK_URL' + (path ? '_' + pushGroup : '')];

    this.logger.debug('`====> webhookUrl: %s', webhookUrl);
    if (!webhookUrl) {
      return { message: 'Webhook Url Not configured' };
    }

    const gitlabEvent = headers['x-gitlab-event'];
    this.logger.debug({ message: 'Received headers', headers });
    this.logger.debug({ message: `Received body`, body });
    this.logger.log(`====> Received gitlabEvent: %s`, gitlabEvent);

    // check platform
    const platform = process.env['PLATFORM'] || Config.platform;
    this.logger.log('platform: %s', platform);

    if (Config.supportPlatforms.indexOf(platform) === -1) {
      const errMsg = `====> platform "${platform}" is not supported, only support: ${Config.supportPlatforms.join(', ')}`;
      this.logger.error(errMsg);
      return { message: errMsg };
    }

    // check x-gitlab-event
    if (gitlabEvent) {
      if (Object.values(X_GITLAB_EVENT).indexOf(gitlabEvent) === -1) {
        const errMsg = `====> x-gitlab-event "${gitlabEvent}" is not supported}`;
        this.logger.error(errMsg);
        return { message: errMsg };
      }
    }

    const translateMsg = await this.webhookService.translateMsg(
      body,
      platform,
      gitlabEvent,
      pushGroup,
    );

    this.logger.debug({ message: 'translateMsg', translateMsg });

    const axiosResponse = await firstValueFrom(
      this.httpService.post(webhookUrl, translateMsg, {
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
      }),
    );

    this.logger.log(
      `response status: ${axiosResponse.status}，data:${JSON.stringify(axiosResponse.data)}`,
    );
    return { message: 'Webhook processed successfully' };
  }
}
