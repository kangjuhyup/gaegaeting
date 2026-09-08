export interface SlackAttachment {
  color?: 'good' | 'warning' | 'danger' | string;
  pretext?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: SlackField[];
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

export interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  elements?: any[];
  accessory?: any;
}

export interface SlackMessage {
  text?: string;
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  channel?: string;
  attachments?: SlackAttachment[];
  blocks?: SlackBlock[];
  thread_ts?: string;
  reply_broadcast?: boolean;
}

export enum SlackColor {
  GOOD = 'good',
  WARNING = 'warning', 
  DANGER = 'danger',
  PRIMARY = '#0099ff',
  SUCCESS = '#28a745',
  INFO = '#17a2b8',
  SECONDARY = '#6c757d'
}

export enum SlackChannel {
  GENERAL = '#general',
  ALERTS = '#alerts',
  ERRORS = '#errors',
  DEPLOYMENTS = '#deployments',
  MONITORING = '#monitoring'
}