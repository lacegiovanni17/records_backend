export const AppResponse = {
  success: <T>(message: string, statusCode: number, data: T = {} as T) => ({
    status: true,
    statusCode,
    message,
    data,
  }),
};
