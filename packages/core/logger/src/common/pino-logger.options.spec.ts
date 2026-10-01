import { createPinoLoggerOptions } from './pino-logger.options.js';

describe('createPinoLoggerOptions', () => {
  test('redacts credentials and transient identity-verification values', () => {
    const options = createPinoLoggerOptions({ pretty: false });
    expect(options.pinoHttp.redact.paths).toEqual(expect.arrayContaining([
      'req.headers.authorization',
      'req.body.ci',
      'req.body.di',
      'req.body.handoffId',
      'req.body.variables.input.ci',
      'req.body.variables.input.di',
      'req.body.variables.input.handoffId',
    ]));
  });
});
