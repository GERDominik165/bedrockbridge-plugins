declare module '@minecraft/server-net' {
  export enum HttpRequestMethod {
    Delete = 'Delete',
    Get = 'Get',
    Head = 'Head',
    Post = 'Post',
    Put = 'Put'
  }

  export interface HttpHeader {
    key: string;
    value: string;
  }

  export interface HttpRequestConfig {
    uri: string;
    method: HttpRequestMethod;
    headers?: HttpHeader[];
    body?: string;
    timeout?: number;
  }

  export class HttpRequest {
    constructor(uri: string);
    uri: string;
    method: HttpRequestMethod;
    headers: HttpHeader[];
    body: string;
    timeout: number;
    addHeader(key: string, value: string): HttpRequest;
    setBody(body: string): HttpRequest;
    setMethod(method: HttpRequestMethod): HttpRequest;
    setTimeout(timeout: number): HttpRequest;
  }

  export interface HttpResponse {
    status: number;
    headers: HttpHeader[];
    body: string;
    request: HttpRequest;
  }

  export class HttpClient {
    cancelAll(reason: string): void;
    get(uri: string): Promise<HttpResponse>;
    request(config: HttpRequest): Promise<HttpResponse>;
  }

  export const http: HttpClient;
  export const beforeEvents: any;
}
