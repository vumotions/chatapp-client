import { TParams } from '~/types/parma.types'

export const createParams = (params: TParams = {}): Record<string, string | number> => {
  // Đảm bảo params không phải là undefined
  if (!params) {
    return { page: 1, limit: 10 };
  }
  
  const { postTypes, page = 1, limit = 10, userId } = params;
  const result: Record<string, string | number> = {
    page,
    limit
  };

  if (postTypes && postTypes.length > 0) {
    result.postTypes = postTypes.join(',');
  }

  if (userId) {
    result.userId = userId;
  }

  return result;
}
