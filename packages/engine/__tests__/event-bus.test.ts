import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEvent } from "../shared/events/domain-event";
import { EventBus } from "../shared/events/event-bus";

describe("EventBus", () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it("should deliver events to subscribed handlers", () => {
    const handler = vi.fn();
    bus.subscribe("TestEvent", handler);

    const event = createEvent("TestEvent", "test", { value: 42 });
    bus.publish(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it("should support multiple handlers for the same event", () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    bus.subscribe("TestEvent", handler1);
    bus.subscribe("TestEvent", handler2);

    bus.publish(createEvent("TestEvent", "test", {}));

    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();
  });

  it("should not deliver events to unrelated handlers", () => {
    const handler = vi.fn();
    bus.subscribe("OtherEvent", handler);

    bus.publish(createEvent("TestEvent", "test", {}));

    expect(handler).not.toHaveBeenCalled();
  });

  it("should support unsubscribe", () => {
    const handler = vi.fn();
    const unsub = bus.subscribe("TestEvent", handler);

    bus.publish(createEvent("TestEvent", "test", {}));
    expect(handler).toHaveBeenCalledOnce();

    unsub();

    bus.publish(createEvent("TestEvent", "test", {}));
    expect(handler).toHaveBeenCalledOnce(); // still 1, not 2
  });

  it("should catch handler errors without affecting others", () => {
    const failingHandler = vi.fn(() => {
      throw new Error("handler crashed");
    });
    const successHandler = vi.fn();

    bus.subscribe("TestEvent", failingHandler);
    bus.subscribe("TestEvent", successHandler);

    // Should not throw
    expect(() => bus.publish(createEvent("TestEvent", "test", {}))).not.toThrow();
    expect(successHandler).toHaveBeenCalledOnce();
  });

  it("should record event history", () => {
    bus.publish(createEvent("Event1", "test", { a: 1 }));
    bus.publish(createEvent("Event2", "test", { b: 2 }));
    bus.publish(createEvent("Event1", "test", { c: 3 }));

    expect(bus.getHistory()).toHaveLength(3);
    expect(bus.getHistory("Event1")).toHaveLength(2);
    expect(bus.getHistory("Event2")).toHaveLength(1);
  });

  it("should limit history size", () => {
    const smallBus = new EventBus(3);

    for (let i = 0; i < 5; i++) {
      smallBus.publish(createEvent("Event", "test", { i }));
    }

    expect(smallBus.getHistory()).toHaveLength(3);
  });

  it("should reset all state", () => {
    const handler = vi.fn();
    bus.subscribe("TestEvent", handler);
    bus.publish(createEvent("TestEvent", "test", {}));

    expect(handler).toHaveBeenCalledOnce();
    expect(bus.getHistory()).toHaveLength(1);

    bus.reset();

    // After reset: no handlers, no history
    expect(bus.getHistory()).toHaveLength(0);

    bus.publish(createEvent("TestEvent", "test", {}));
    // Handler was removed — should NOT have been called again
    expect(handler).toHaveBeenCalledOnce();
    // But the new event IS in history (bus still works, just no subscribers)
    expect(bus.getHistory()).toHaveLength(1);
  });
});

describe("createEvent", () => {
  it("should generate unique IDs", () => {
    const e1 = createEvent("Test", "src", {});
    const e2 = createEvent("Test", "src", {});
    expect(e1.id).not.toBe(e2.id);
  });

  it("should set timestamp and source", () => {
    const before = new Date();
    const event = createEvent("Test", "my-module", { data: true });
    const after = new Date();

    expect(event.source).toBe("my-module");
    expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(event.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("should include correlationId when provided", () => {
    const event = createEvent("Test", "src", {}, "corr-123");
    expect(event.correlationId).toBe("corr-123");
  });
});
