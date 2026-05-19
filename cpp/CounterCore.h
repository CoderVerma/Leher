#pragma once
#include <atomic>
#include <functional>
#include <mutex>

namespace leher {

struct CounterEvent {
  int value;
  int pressCount;
};

class CounterCore {
 public:
  using OnChangeCallback = std::function<void(CounterEvent)>;

  CounterCore() noexcept = default;
  ~CounterCore() = default;

  CounterCore(const CounterCore&) = delete;
  CounterCore& operator=(const CounterCore&) = delete;

  int increment() noexcept;
  int decrement() noexcept;
  int reset() noexcept;
  int getValue() const noexcept;
  int getPressCount() const noexcept;

  void setOnChange(OnChangeCallback cb);

 private:
  std::atomic<int> value_{0};
  std::atomic<int> pressCount_{0};
  mutable std::mutex callbackMutex_;
  OnChangeCallback onChange_;

  void notifyChange(int value, int pressCount);
};

} // namespace leher
