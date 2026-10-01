import { z } from 'zod';

export const Id = z.string().max(96).regex(/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/)
  .refine(value => !['constructor', 'prototype', '__proto__'].includes(value)
    && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value) && !value.endsWith('.'), 'Reserved identifier');
