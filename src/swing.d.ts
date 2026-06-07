declare module "swing" {
  export type DirectionValue = symbol;

  export const Direction: {
    DOWN: DirectionValue;
    INVALID: DirectionValue;
    LEFT: DirectionValue;
    RIGHT: DirectionValue;
    UP: DirectionValue;
  };

  export type SwingEvent = {
    target: HTMLElement;
    throwDirection?: DirectionValue;
    throwOutConfidence?: number;
    offset?: number;
  };

  export type SwingCard = {
    on: (eventName: string, listener: (event: SwingEvent) => void) => void;
    throwIn: (coordinateX: number, coordinateY: number, direction?: DirectionValue) => void;
    throwOut: (coordinateX: number, coordinateY: number, direction?: DirectionValue) => void;
    destroy: () => void;
  };

  export type SwingStack = {
    createCard: (element: HTMLElement, prepend?: boolean) => SwingCard;
    getCard: (element: HTMLElement) => SwingCard | null;
    on: (eventName: string, listener: (event: SwingEvent) => void) => void;
  };

  export type StackConfig = {
    allowedDirections: DirectionValue[];
    isThrowOut: (
      xOffset: number,
      yOffset: number,
      element: HTMLElement,
      throwOutConfidence: number,
    ) => boolean;
    maxRotation: number;
    minThrowOutDistance: number;
    maxThrowOutDistance: number;
    rotation: (
      coordinateX: number,
      coordinateY: number,
      element: HTMLElement,
      maxRotation: number,
    ) => number;
    throwOutConfidence: (xOffset: number, yOffset: number, element: HTMLElement) => number;
    throwOutDistance: (min: number, max: number) => number;
  };

  export function Stack(config?: Partial<StackConfig>): SwingStack;
}
