export type Subgraph = { name: string; url: string };

export function getSubgraphServices(environment = process.env): Subgraph[] {
  const services = [
    { name: 'account', url: environment.ACCOUNT_SERVICE_URL ?? 'http://127.0.0.1:2800/account/graphql' },
    { name: 'match', url: environment.MATCH_SERVICE_URL ?? 'http://127.0.0.1:2801/match/graphql' },
  ];
  if (environment.CHAT_SERVICE_URL?.trim()) {
    services.push({ name: 'chat', url: environment.CHAT_SERVICE_URL });
  }
  if (environment.PAYMENT_SERVICE_URL?.trim()) {
    services.push({ name: 'payment', url: environment.PAYMENT_SERVICE_URL });
  }
  if (environment.CHALLENGE_SERVICE_URL?.trim()) {
    services.push({ name: 'challenge', url: environment.CHALLENGE_SERVICE_URL });
  }
  return services.filter(service => !!service.url);
}
