declare module 'expo-device' {
  export const isDevice: boolean;
}

declare module 'expo-notifications' {
  export interface NotificationRequest {
    content: any;
  }
  
  export interface NotificationResponse {
    notification: {
      request: NotificationRequest;
    };
  }
  
  export function getPermissionsAsync(): Promise<{ status: string }>;
  export function requestPermissionsAsync(): Promise<{ status: string }>;
  export function getExpoPushTokenAsync(): Promise<{ data: string }>;
  export function setNotificationHandler(handler: any): void;
  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): any;
  export function removeNotificationSubscription(subscription: any): void;
}