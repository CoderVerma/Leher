#include "CounterCore.h"

namespace leher {

int CounterCore::increment() noexcept {
  int pc = ++pressCount_;
  int step = (pc % 5 == 0) ? 5 : 1;
  int next = value_.fetch_add(step, std::memory_order_relaxed) + step;
  notifyChange(next, pc);
  return next;
}

int CounterCore::decrement() noexcept {
  int current = value_.load(std::memory_order_relaxed);
  while (current > 0) {
    if (value_.compare_exchange_weak(
            current, current - 1,
            std::memory_order_release,
            std::memory_order_relaxed)) {
      int pc = pressCount_.load(std::memory_order_relaxed);
      notifyChange(current - 1, pc);
      return current - 1;
    }
  }
  return 0;
}

int CounterCore::reset() noexcept {
  value_.store(0, std::memory_order_release);
  pressCount_.store(0, std::memory_order_release);
  notifyChange(0, 0);
  return 0;
}

int CounterCore::getValue() const noexcept {
  return value_.load(std::memory_order_acquire);
}

int CounterCore::getPressCount() const noexcept {
  return pressCount_.load(std::memory_order_acquire);
}

void CounterCore::setOnChange(OnChangeCallback cb) {
  std::lock_guard<std::mutex> lock(callbackMutex_);
  onChange_ = std::move(cb);
}

void CounterCore::notifyChange(int value, int pressCount) {
  std::lock_guard<std::mutex> lock(callbackMutex_);
  if (onChange_) {
    onChange_({value, pressCount});
  }
}

} // namespace leher
