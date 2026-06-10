"use client";

import type { Channel } from "pusher-js";
import { useEffect, useRef } from "react";
import { getPusherClient } from "@/lib/realtime/pusher-client";

export type PusherEventHandlers = Record<string, (data: unknown) => void>;

export function usePusherChannel(
  channelName: string | null | undefined,
  handlers: PusherEventHandlers,
  enabled = true,
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !channelName) {
      return;
    }

    const pusher = getPusherClient();

    if (!pusher) {
      return;
    }

    const channel: Channel = pusher.subscribe(channelName);
    const boundHandlers = new Map<string, (data: unknown) => void>();

    for (const [event, _handler] of Object.entries(handlersRef.current)) {
      const wrappedHandler = (data: unknown) => {
        handlersRef.current[event]?.(data);
      };
      boundHandlers.set(event, wrappedHandler);
      channel.bind(event, wrappedHandler);
    }

    return () => {
      for (const [event, wrappedHandler] of boundHandlers) {
        channel.unbind(event, wrappedHandler);
      }
      pusher.unsubscribe(channelName);
    };
  }, [channelName, enabled]);
}
