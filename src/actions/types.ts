export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  timestamp?: number;
};

export const initialActionState: ActionState = {
  status: "idle",
  timestamp: 0,
};
