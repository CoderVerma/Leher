cmake_minimum_required(VERSION 3.22.1)
project(leher_counter CXX)

# Path from this CMakeLists.txt (android/app/src/main/cpp/) up to the
# project-root cpp/ directory containing CounterCore.h/.cpp
set(SHARED_CPP_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../cpp")

add_library(
    leher_counter
    SHARED
    CounterJNI.cpp
    ${SHARED_CPP_DIR}/CounterCore.cpp
)

target_include_directories(leher_counter PRIVATE
    ${SHARED_CPP_DIR}
)

target_compile_options(leher_counter PRIVATE -std=c++17)

find_library(log-lib log)
target_link_libraries(leher_counter ${log-lib})
