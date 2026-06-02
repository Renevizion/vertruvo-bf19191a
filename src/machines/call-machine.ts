import { createMachine } from "xstate";

export const callMachine = createMachine({
  id: "call",
  initial: "idle",
  states: {
    idle: {
      on: {
        START: "connecting",
      },
    },
    connecting: {
      on: {
        CONNECTED: "connected",
        FAIL: "error",
        DISCONNECT: "idle",
      },
    },
    connected: {
      on: {
        SPEAKING: "speaking",
        LISTENING: "connected",
        DISCONNECT: "idle",
        FAIL: "error",
      },
    },
    speaking: {
      on: {
        LISTENING: "connected",
        DISCONNECT: "idle",
        FAIL: "error",
      },
    },
    error: {
      on: {
        START: "connecting",
        DISCONNECT: "idle",
      },
    },
  },
});
