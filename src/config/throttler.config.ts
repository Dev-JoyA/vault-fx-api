import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      ttl: 60000, 
      limit: 10, 
    },
    {
      ttl: 60000,
      limit: 30, 
    },
    {
      ttl: 60000,
      limit: 5, 
    },
  ],
};