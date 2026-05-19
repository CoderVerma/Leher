#import "NativeCounterModule.h"
#include "../../cpp/CounterCore.h"

using namespace leher;

static NSString *const kEventName = @"onCounterChange";

@implementation NativeCounterModule {
  CounterCore _counter;
  BOOL _hasListeners;
}

RCT_EXPORT_MODULE(NativeCounter)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

- (instancetype)init {
  self = [super init];
  if (!self) return nil;

  __weak typeof(self) weakSelf = self;

  _counter.setOnChange([weakSelf](CounterEvent event) {
    typeof(self) strongSelf = weakSelf;
    if (!strongSelf || !strongSelf->_hasListeners) return;

    [strongSelf sendEventWithName:kEventName
                             body:@{
                               @"value":      @(event.value),
                               @"pressCount": @(event.pressCount),
                             }];
  });

  return self;
}

- (NSArray<NSString *> *)supportedEvents {
  return @[kEventName];
}

- (void)startObserving { _hasListeners = YES; }
- (void)stopObserving  { _hasListeners = NO;  }

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(increment) {
  return @(_counter.increment());
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(decrement) {
  return @(_counter.decrement());
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(reset) {
  return @(_counter.reset());
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getValue) {
  return @(_counter.getValue());
}

RCT_EXPORT_METHOD(addListener:(NSString *)eventName) {}
RCT_EXPORT_METHOD(removeListeners:(double)count)      {}

@end
