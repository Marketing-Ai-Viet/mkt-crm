/**
 * HTTP Exception Mapper Utility
 *
 * Convert Axios errors to NestJS HttpExceptions to preserve
 * status code and message from external APIs
 *
 * @module HttpExceptionMapper
 */

import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  RequestTimeoutException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { AxiosError } from 'axios';

/**
 * HTTP Error Response from external API
 */
type HttpErrorResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  [key: string]: unknown;
};

/**
 * Map Axios error to NestJS HttpException
 *
 * Preserve status code and message from external API
 *
 * @param error - Axios error object
 * @param defaultMessage - Default message if no message from API
 * @returns NestJS HttpException
 *
 * @example
 * ```typescript
 * try {
 *   await axios.get('/api/users/123');
 * } catch (error) {
 *   throw mapAxiosErrorToHttpException(error, 'Failed to fetch user');
 * }
 * ```
 */
export const mapAxiosErrorToHttpException = (
  error: unknown,
  defaultMessage = 'External API request failed',
): HttpException => {
  const axiosError = error as AxiosError<HttpErrorResponse>;

  // Extract error details from response
  const status =
    axiosError.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
  const responseData = axiosError.response?.data;

  // Extract message from response
  let message = defaultMessage;

  if (responseData?.message) {
    message = Array.isArray(responseData.message)
      ? responseData.message.join(', ')
      : responseData.message;
  } else if (responseData?.error) {
    message = responseData.error;
  } else if (axiosError.message) {
    message = axiosError.message;
  }

  // Map status code to appropriate NestJS exception
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return new BadRequestException(message);

    case HttpStatus.UNAUTHORIZED:
      return new UnauthorizedException(message);

    case HttpStatus.FORBIDDEN:
      return new ForbiddenException(message);

    case HttpStatus.NOT_FOUND:
      return new NotFoundException(message);

    case HttpStatus.REQUEST_TIMEOUT:
      return new RequestTimeoutException(message);

    case HttpStatus.CONFLICT:
      return new ConflictException(message);

    case HttpStatus.UNPROCESSABLE_ENTITY:
      return new UnprocessableEntityException(message);

    case HttpStatus.BAD_GATEWAY:
      return new BadGatewayException(message);

    case HttpStatus.SERVICE_UNAVAILABLE:
      return new ServiceUnavailableException(message);

    case HttpStatus.GATEWAY_TIMEOUT:
      return new GatewayTimeoutException(message);

    default:
      // For 5xx errors, INTERNAL_SERVER_ERROR, or unknown errors
      return new InternalServerErrorException(message);
  }
};

/**
 * Check if error is Axios error
 *
 * @param error - Error object
 * @returns true if Axios error
 */
export const isAxiosError = (error: unknown): error is AxiosError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
};

/**
 * Get HTTP status code from error
 *
 * @param error - Error object (can be Axios error or HttpException)
 * @returns HTTP status code
 */
export const getHttpStatusFromError = (error: unknown): number => {
  if (error instanceof HttpException) {
    return error.getStatus();
  }

  if (isAxiosError(error)) {
    return error.response?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  return HttpStatus.INTERNAL_SERVER_ERROR;
};

/**
 * Get error message from error (enhanced version)
 *
 * @param error - Error object
 * @returns Error message
 */
export const getMessageFromHttpError = (error: unknown): string => {
  if (error instanceof HttpException) {
    const response = error.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    return (response as { message?: string }).message ?? error.message;
  }

  if (isAxiosError(error)) {
    const responseData = error.response?.data as HttpErrorResponse | undefined;

    if (responseData?.message) {
      return Array.isArray(responseData.message)
        ? responseData.message.join(', ')
        : responseData.message;
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown error';
};
