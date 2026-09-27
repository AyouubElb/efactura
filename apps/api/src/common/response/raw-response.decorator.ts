import { SetMetadata } from '@nestjs/common';

export const RAW_RESPONSE = 'rawResponse';

// Skips the { success, data } wrapper
export const RawResponse = () => SetMetadata(RAW_RESPONSE, true);
