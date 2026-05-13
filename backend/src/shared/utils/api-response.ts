export interface ApiMessageResponse<T> {
  data: T;
  message?: string;
}

export const apiResponse = <T>(data: T, message?: string): ApiMessageResponse<T> => ({
  data,
  message
});
