#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <iostream>
#include <vector>
#include <cstdint>
#include <atomic>
#include <thread>
#include <chrono>
#include <mutex>

#define NDI_LIB_FOURCC(ch0, ch1, ch2, ch3) \
    ((uint32_t)(uint8_t)(ch0) | ((uint32_t)(uint8_t)(ch1) << 8) | \
    ((uint32_t)(uint8_t)(ch2) << 16) | ((uint32_t)(uint8_t)(ch3) << 24))

enum NDIlib_FourCC_type_e {
    NDIlib_FourCC_type_RGBA = NDI_LIB_FOURCC('R', 'G', 'B', 'A'),
    NDIlib_FourCC_type_BGRA = NDI_LIB_FOURCC('B', 'G', 'R', 'A')
};

enum NDIlib_frame_format_type_e {
    NDIlib_frame_format_type_progressive = 1
};

#pragma pack(push, 8)
struct NDIlib_send_create_t {
    const char* p_ndi_name;
    const char* p_groups;
    bool clock_video;
    bool clock_audio;
};

struct NDIlib_video_frame_v2_t {
    int xres;
    int yres;
    uint32_t FourCC;
    int frame_rate_N;
    int frame_rate_D;
    float picture_aspect_ratio;
    int frame_format_type;
    int64_t timecode;
    uint8_t* p_data;
    int line_stride_in_bytes;
    const char* p_metadata;
    int64_t timestamp;
};
#pragma pack(pop)

typedef bool (*NDIlib_initialize_fn)();
typedef void (*NDIlib_destroy_fn)();
typedef void* (*NDIlib_send_create_fn)(const NDIlib_send_create_t* p_create_settings);
typedef void (*NDIlib_send_destroy_fn)(void* p_instance);
typedef void (*NDIlib_send_send_video_v2_fn)(void* p_instance, const NDIlib_video_frame_v2_t* p_video_data);

static const char* PIPE_NAME = "\\\\.\\pipe\\LuiLyricFramePipe";
static const uint32_t HEADER_MAGIC = 0x52464C4C; // "LLFR"

struct FrameHeader {
    uint32_t magic;
    uint32_t width;
    uint32_t height;
    uint32_t fps;
};

int main(int argc, char* argv[])
{
    std::cout << "=====================================================" << std::endl;
    std::cout << "  LuiLyric Native NDI Alpha Bridge (LL-B01)          " << std::endl;
    std::cout << "  Target Sender Name: 'LuiLyric - Main'              " << std::endl;
    std::cout << "=====================================================" << std::endl;

    const wchar_t* dllPaths[] = {
        L"C:\\Program Files\\NDI\\NDI 6 Tools\\Runtime\\Processing.NDI.Lib.x64.dll",
        L"C:\\Program Files\\Resolume Arena\\Processing.NDI.Lib.x64.dll"
    };

    HMODULE hNdi = nullptr;
    for (const auto& path : dllPaths) {
        hNdi = LoadLibraryW(path);
        if (hNdi) {
            std::wcout << L"[LuiLyric NDI] Loaded library: " << path << std::endl;
            break;
        }
    }

    if (!hNdi) {
        std::cerr << "[LuiLyric NDI] FATAL: Processing.NDI.Lib.x64.dll not found!" << std::endl;
        return 1;
    }

    auto fn_init = (NDIlib_initialize_fn)GetProcAddress(hNdi, "NDIlib_initialize");
    auto fn_destroy = (NDIlib_destroy_fn)GetProcAddress(hNdi, "NDIlib_destroy");
    auto fn_send_create = (NDIlib_send_create_fn)GetProcAddress(hNdi, "NDIlib_send_create");
    auto fn_send_destroy = (NDIlib_send_destroy_fn)GetProcAddress(hNdi, "NDIlib_send_destroy");
    auto fn_send_video = (NDIlib_send_send_video_v2_fn)GetProcAddress(hNdi, "NDIlib_send_send_video_v2");

    if (!fn_init || !fn_destroy || !fn_send_create || !fn_send_destroy || !fn_send_video) {
        std::cerr << "[LuiLyric NDI] FATAL: Missing NDI exported functions!" << std::endl;
        FreeLibrary(hNdi);
        return 1;
    }

    if (!fn_init()) {
        std::cerr << "[LuiLyric NDI] FATAL: NDIlib_initialize() failed!" << std::endl;
        FreeLibrary(hNdi);
        return 1;
    }

    NDIlib_send_create_t createSettings{};
    createSettings.p_ndi_name = "LuiLyric - Main";
    createSettings.clock_video = false;
    createSettings.clock_audio = false;

    void* pSender = fn_send_create(&createSettings);
    if (!pSender) {
        std::cerr << "[LuiLyric NDI] FATAL: NDIlib_send_create failed!" << std::endl;
        fn_destroy();
        FreeLibrary(hNdi);
        return 1;
    }

    std::cout << "[LuiLyric NDI] Online and advertising: 'LuiLyric - Main'" << std::endl;
    std::cout << "[LuiLyric NDI] Listening on Named Pipe: " << PIPE_NAME << std::endl;

    int curWidth = 1920;
    int curHeight = 1080;
    int curFps = 60;

    std::vector<uint8_t> frameBuffer(curWidth * curHeight * 4, 0); // 100% transparent initially
    std::atomic<bool> isRunning{ true };
    std::atomic<bool> hasNewFrame{ false };
    std::atomic<int64_t> lastFrameTimeMs{ 0 };
    std::mutex sendMutex;

    auto getSteadyNowMs = []() -> int64_t {
        return std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::steady_clock::now().time_since_epoch()
        ).count();
    };

    lastFrameTimeMs.store(getSteadyNowMs());

    NDIlib_video_frame_v2_t videoFrame{};
    videoFrame.xres = curWidth;
    videoFrame.yres = curHeight;
    videoFrame.FourCC = NDIlib_FourCC_type_RGBA;
    videoFrame.frame_rate_N = curFps * 1000;
    videoFrame.frame_rate_D = 1000;
    videoFrame.picture_aspect_ratio = (float)curWidth / (float)curHeight;
    videoFrame.frame_format_type = NDIlib_frame_format_type_progressive;
    videoFrame.timecode = 0x7fffffffffffffffLL;
    videoFrame.p_data = frameBuffer.data();
    videoFrame.line_stride_in_bytes = curWidth * 4;

    // Heartbeat transmitter thread: ensures continuous carrier signal to Resolume Arena if pipe is idle
    std::thread transmitter([&]() {
        while (isRunning.load()) {
            int64_t nowMs = getSteadyNowMs();
            int64_t elapsed = nowMs - lastFrameTimeMs.load();
            if (elapsed >= 100) {
                std::lock_guard<std::mutex> lock(sendMutex);
                fn_send_video(pSender, &videoFrame);
            }
            std::this_thread::sleep_for(std::chrono::milliseconds(20));
        }
    });

    while (isRunning.load()) {
        HANDLE hPipe = CreateNamedPipeA(
            PIPE_NAME,
            PIPE_ACCESS_DUPLEX,
            PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT,
            1,
            32 * 1024 * 1024,
            32 * 1024 * 1024,
            0,
            NULL
        );

        if (hPipe == INVALID_HANDLE_VALUE) {
            std::cerr << "[LuiLyric NDI] Failed to create Named Pipe. Error: " << GetLastError() << std::endl;
            std::this_thread::sleep_for(std::chrono::seconds(1));
            continue;
        }

        std::cout << "[LuiLyric NDI] Waiting for connection from LuiLyric host..." << std::endl;
        BOOL connected = ConnectNamedPipe(hPipe, NULL) ? TRUE : (GetLastError() == ERROR_PIPE_CONNECTED);

        if (connected) {
            std::cout << "[LuiLyric NDI] Host connected! Streaming live frames to Resolume NDI..." << std::endl;

            while (isRunning.load()) {
                FrameHeader header{};
                DWORD bytesRead = 0;
                BOOL ok = ReadFile(hPipe, &header, sizeof(header), &bytesRead, NULL);
                if (!ok || bytesRead != sizeof(header)) {
                    std::cout << "[LuiLyric NDI] Host disconnected or pipe closed." << std::endl;
                    break;
                }

                if (header.magic != HEADER_MAGIC) {
                    std::cerr << "[LuiLyric NDI] Invalid frame header magic: " << std::hex << header.magic << std::endl;
                    break;
                }

                if (header.width != curWidth || header.height != curHeight) {
                    curWidth = header.width;
                    curHeight = header.height;
                    frameBuffer.resize(curWidth * curHeight * 4, 0);
                    videoFrame.xres = curWidth;
                    videoFrame.yres = curHeight;
                    videoFrame.picture_aspect_ratio = (float)curWidth / (float)curHeight;
                    videoFrame.p_data = frameBuffer.data();
                    videoFrame.line_stride_in_bytes = curWidth * 4;
                }

                size_t expectedBytes = (size_t)curWidth * curHeight * 4;
                size_t totalReceived = 0;
                while (totalReceived < expectedBytes) {
                    DWORD chunk = 0;
                    DWORD toRead = (DWORD)min(expectedBytes - totalReceived, (size_t)(1024 * 1024));
                    ok = ReadFile(hPipe, frameBuffer.data() + totalReceived, toRead, &chunk, NULL);
                    if (!ok || chunk == 0) break;
                    totalReceived += chunk;
                }

                if (header.fps > 0 && (int)header.fps != curFps) {
                    curFps = (int)header.fps;
                    videoFrame.frame_rate_N = curFps * 1000;
                    videoFrame.frame_rate_D = 1000;
                }

                if (totalReceived == expectedBytes) {
                    hasNewFrame.store(true);
                    lastFrameTimeMs.store(getSteadyNowMs());
                    std::lock_guard<std::mutex> lock(sendMutex);
                    fn_send_video(pSender, &videoFrame);
                }
            }
        }

        DisconnectNamedPipe(hPipe);
        CloseHandle(hPipe);
    }

    isRunning.store(false);
    if (transmitter.joinable()) {
        transmitter.join();
    }

    fn_send_destroy(pSender);
    fn_destroy();
    FreeLibrary(hNdi);

    std::cout << "[LuiLyric NDI] Sender stopped." << std::endl;
    return 0;
}
